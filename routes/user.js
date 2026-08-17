import express from "express";
import User from "../models/User.js";
import authenticateJWT from "../middleware/authenticateJWT.js";

const userRouter = express.Router();

const requireAdmin = (req, res, next) => {
    if (!req.admin) {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

/**
 * GET /api/user - Get all users (admin only)
 */
userRouter.get('/', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
});

/**
 * GET /api/user/:id - Get user by ID (admin only)
 */
userRouter.get('/:id', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
});

export default userRouter;