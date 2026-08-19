import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';

/**
 * Generates a clean, unique username.
 */
async function generateUniqueUsername(displayName, email) {
  let base = (displayName || email.split('@')[0])
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!base || base.length < 2) base = 'user';

  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing) return candidate;
    candidate = `${base}${counter}`;
    counter++;
  }
}

/**
 * Register a new user account.
 * POST /api/auth/signup
 */
export async function signup(req, res, next) {
  try {
    const { email, password, displayName } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const username = await generateUniqueUsername(cleanDisplayName, normalizedEmail);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash,
        displayName: cleanDisplayName,
        statusMessage: '⚡ Available',
        presenceStatus: 'online',
        customWallpaper: 'cyber',
        themePreference: 'dark',
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        statusMessage: true,
        avatarUrl: true,
        avatarImage: true,
        presenceStatus: true,
        themePreference: true,
        customWallpaper: true,
        createdAt: true,
      },
    });

    try {
      let defaultRoom = await prisma.room.findUnique({
        where: { name: 'general' },
      });

      if (!defaultRoom) {
        defaultRoom = await prisma.room.create({
          data: {
            name: 'general',
            isPrivate: false,
            createdBy: user.id,
          },
        });
      }

      await prisma.roomMember.upsert({
        where: {
          userId_roomId: {
            userId: user.id,
            roomId: defaultRoom.id,
          },
        },
        create: {
          userId: user.id,
          roomId: defaultRoom.id,
          role: 'member',
        },
        update: {},
      });
    } catch (roomErr) {
      console.warn('Could not auto-join default general room:', roomErr.message);
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in an existing user.
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Auto-populate username if missing for existing user
    let userUsername = user.username;
    if (!userUsername) {
      userUsername = await generateUniqueUsername(user.displayName, user.email);
      await prisma.user.update({
        where: { id: user.id },
        data: { username: userUsername },
      });
    }

    // Ensure user has default general room membership
    try {
      let defaultRoom = await prisma.room.findUnique({
        where: { name: 'general' },
      });

      if (!defaultRoom) {
        defaultRoom = await prisma.room.create({
          data: {
            name: 'general',
            isPrivate: false,
            createdBy: user.id,
          },
        });
      }

      await prisma.roomMember.upsert({
        where: {
          userId_roomId: {
            userId: user.id,
            roomId: defaultRoom.id,
          },
        },
        create: {
          userId: user.id,
          roomId: defaultRoom.id,
          role: 'member',
        },
        update: {},
      });
    } catch (e) {
      // ignore
    }

    const userData = {
      id: user.id,
      email: user.email,
      username: userUsername,
      displayName: user.displayName,
      statusMessage: user.statusMessage || '⚡ Available',
      avatarUrl: user.avatarUrl || '',
      avatarImage: user.avatarImage || null,
      presenceStatus: user.presenceStatus || 'online',
      themePreference: user.themePreference || 'dark',
      customWallpaper: user.customWallpaper || 'cyber',
      createdAt: user.createdAt,
    };

    const token = generateToken(userData);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: userData,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out user.
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * Get current authenticated user profile.
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  // Ensure username is populated
  if (!req.user.username) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user && !user.username) {
      const username = await generateUniqueUsername(user.displayName, user.email);
      await prisma.user.update({ where: { id: user.id }, data: { username } });
      req.user.username = username;
    }
  }

  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

/**
 * Update current user profile & settings.
 * PUT /api/auth/profile
 */
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      displayName,
      username,
      statusMessage,
      avatarUrl,
      avatarImage,
      presenceStatus,
      themePreference,
      customWallpaper,
    } = req.body;

    const updateData = {};
    if (displayName && typeof displayName === 'string' && displayName.trim().length >= 2) {
      updateData.displayName = displayName.trim();
    }
    if (username && typeof username === 'string' && username.trim().length >= 2) {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const existing = await prisma.user.findFirst({
        where: { username: cleanUsername, id: { not: userId } },
      });
      if (!existing) {
        updateData.username = cleanUsername;
      }
    }
    if (typeof statusMessage === 'string') {
      updateData.statusMessage = statusMessage.trim().substring(0, 100);
    }
    if (typeof avatarUrl === 'string') {
      updateData.avatarUrl = avatarUrl.trim();
    }
    if (avatarImage !== undefined) {
      updateData.avatarImage = avatarImage; // Base64 data URL or null
    }
    if (presenceStatus && ['online', 'idle', 'dnd', 'offline'].includes(presenceStatus)) {
      updateData.presenceStatus = presenceStatus;
    }
    if (themePreference && ['dark', 'light'].includes(themePreference)) {
      updateData.themePreference = themePreference;
    }
    if (typeof customWallpaper === 'string') {
      updateData.customWallpaper = customWallpaper;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        statusMessage: true,
        avatarUrl: true,
        avatarImage: true,
        presenceStatus: true,
        themePreference: true,
        customWallpaper: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}
