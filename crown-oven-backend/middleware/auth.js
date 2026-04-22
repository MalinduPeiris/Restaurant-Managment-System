import jwt from "jsonwebtoken";

export default function authenticateUser(req, res, next) {
  const header = req.header("Authorization");
  if (!header) return next();

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
}
