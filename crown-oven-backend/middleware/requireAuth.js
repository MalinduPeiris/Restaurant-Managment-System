import User from "../models/User.js";

export default async function requireAuth(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user.id).select("role isBlocked firstName lastName email");
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    req.user = {
      ...req.user,
      id: user._id.toString(),
      role: user.role,
      isBlocked: user.isBlocked,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Require auth error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
