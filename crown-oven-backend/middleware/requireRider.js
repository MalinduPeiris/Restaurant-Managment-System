import User from "../models/User.js";

export default async function requireRider(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "rider") {
      return res.status(403).json({ message: "Rider access required" });
    }

    const rider = await User.findById(req.user.id).select("role isBlocked");
    if (!rider || rider.role !== "rider") {
      return res.status(403).json({ message: "Rider access required" });
    }
    if (rider.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    next();
  } catch (error) {
    console.error("Require rider error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
