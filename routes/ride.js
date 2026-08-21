import express from "express";
import Ride from "../models/Ride.js";
import authenticateJWT from "../middleware/authenticateJWT.js";

const router = express.Router();

/**
 * POST /api/rides - Book a new ride (secured)
 */
router.post("/", authenticateJWT, async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, scheduledTime, contactInfo } = req.body;

        if (!pickupLocation || !dropoffLocation || !scheduledTime || !contactInfo) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Determine who is booking the ride (user or admin)
        const rider = req.user?.userId || req.admin?.adminId;

        const ride = new Ride({
            pickupLocation,
            dropoffLocation,
            scheduledTime,
            contactInfo,
            rider, // Associate the ride with the user or admin who booked it
        });

        await ride.save();
        res.status(201).json({ message: "Ride booked successfully", ride });
    } catch (err) {
        console.error(err); // Log the error for debugging
        res.status(500).json({ message: "Error booking ride", error: err.message });
    }
});

/**
 * GET /api/rides - Get rides (secured)
 */
router.get("/", authenticateJWT, async (req, res) => {
    try {
        const { status, search } = req.query;

        const filter = {};

        // If the request is from a user, filter rides by their userId
        if (req.user?.userId) {
            filter.rider = req.user.userId;
        }

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.contactInfo = { $regex: search, $options: "i" };
        }

        // If the request is from an admin, they can view all rides
        // Fethc rides and populate the rider field with user details
        const rides = await Ride.find(filter)
            .populate("rider", "username email")
            .sort({ scheduledTime: 1 });

        if (rides.length === 0) {
            return res.status(200).json({ message: "No rides found", rides: [] });
        }

        res.status(200).json(rides);
    } catch (err) {
        console.error("Error fetching rides:", err); // Debugging log
        res.status(500).json({ message: "Failed to get rides", error: err.message });
    }
});

/**
 * PATCH /api/rides/:id - Update ride status (secured)
 */
router.patch("/:id", authenticateJWT, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }
        
        // Check if the user is authorized to update the ride
        if (req.user?.userId && ride.rider.toString() !== req.user.userId) {
            return res.status(403).json({ message: "You are not authorized to update this ride" });
        }

        // Admins can update any ride
        ride.status = req.body.status;
        await ride.save();
        
        res.json({ message: "Ride updated successfully", ride });
    } catch (err) {
        res.status(500).json({ message: "Failed to update ride", error: err.message });
    }
});

/**
 * DELETE /api/rides/:id - Delete a ride by ID (secured)
 */
router.delete("/:id", authenticateJWT, async (req, res) => {
    try {
      const ride = await Ride.findById(req.params.id);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Check if the user is authorized to delete the ride
      if (req.user?.userId && ride.rider.toString() !== req.user.userId) {
        return res.status(403).json({ message: "You are not authorized to delete this ride" });
      }

      // Admins can delete any ride
      await Ride.findByIdAndDelete(req.params.id);

      res.status(204).json({ message: "Ride deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete ride", error: err.message });
    }
  });
export default router;