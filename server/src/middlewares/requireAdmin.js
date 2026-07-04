export const requireAdmin = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  const validToken = process.env.ADMIN_TOKEN;

  if (!validToken) {
    console.warn('ADMIN_TOKEN is not defined in .env');
    return res.status(500).json({ message: 'Server configuration error.' });
  }

  if (adminToken && adminToken === validToken) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied: Valid Admin Token required.' });
};
