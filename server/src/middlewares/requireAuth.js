export const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: 'Access denied. Active session context not detected. Please sign in.' 
    });
  }
  next();
};