const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Quyền truy cập bị từ chối: Chỉ dành cho Admin'
        });
    }
};

export { admin };