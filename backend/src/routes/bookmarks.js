const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Get all bookmarks for the logged-in user
router.get('/', async (req, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId },
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Create a bookmark
router.post(
  '/',
  [
    body('url').isURL().withMessage('Valid URL required'),
    body('title').trim().notEmpty().withMessage('Title required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, title, description } = req.body;

    try {
      const bookmark = await prisma.bookmark.create({
        data: {
          url,
          title,
          description: description || null,
          userId: req.userId,
        },
      });
      res.status(201).json(bookmark);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  }
);

// Update a bookmark (must own it)
router.put('/:id', async (req, res) => {
  const bookmarkId = parseInt(req.params.id);
  const { url, title, description } = req.body;

  try {
    const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });

    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this bookmark' });
    }

    const updated = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { url, title, description },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// Delete a bookmark (must own it)
router.delete('/:id', async (req, res) => {
  const bookmarkId = parseInt(req.params.id);

  try {
    const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });

    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this bookmark' });
    }

    await prisma.bookmark.delete({ where: { id: bookmarkId } });
    res.json({ message: 'Bookmark deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

module.exports = router;
