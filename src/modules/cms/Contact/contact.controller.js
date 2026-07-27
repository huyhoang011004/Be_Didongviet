import Contact from './contact.model.js';
import jwt from 'jsonwebtoken';

export const contactController = {
    // 1. GỬI YÊU CẦU LIÊN HỆ (Public - Dành cho khách hàng trên Website)
    submitContact: async (req, res) => {
        try {
            const { fullName, email, phone, subject, message } = req.body;

            // Validate cơ bản đầu vào
            if (!fullName || !email || !phone || !message) {
                return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
            }

            // Nhận diện user đăng nhập (nếu có) để liên kết phiếu
            let userId = null;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                    userId = decoded._id;
                } catch (e) {
                    // Bỏ qua lỗi nếu khách vãng lai gửi
                }
            }

            const newContact = await Contact.create({
                fullName,
                email,
                phone,
                subject,
                message,
                user: userId
            });

            return res.status(201).json({
                success: true,
                message: 'Thông tin phản hồi của bạn đã được gửi đi thành công. Chúng tôi sẽ liên hệ lại sớm nhất!',
                data: newContact
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 2. LẤY DANH SÁCH LIÊN HỆ (Admin Only - Có bộ lọc trạng thái & Phân trang)
    getContacts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Bộ lọc dữ liệu (Ví dụ lọc theo status: ?status=Chưa xử lý)
            const filter = {};
            if (req.query.status) {
                filter.status = req.query.status;
            }
            if (req.query.subject) {
                filter.subject = req.query.subject;
            }

            const contacts = await Contact.find(filter)
                .populate('processedBy', 'name role') // Xem nhân viên nào đang chịu trách nhiệm
                .sort({ createdAt: -1 }) // Yêu cầu mới nhất xếp lên đầu
                .skip(skip)
                .limit(limit);

            const totalContacts = await Contact.countDocuments(filter);

            return res.status(200).json({
                success: true,
                pagination: {
                    totalItems: totalContacts,
                    totalPages: Math.ceil(totalContacts / limit),
                    currentPage: page,
                    limit
                },
                data: contacts
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. CẬP NHẬT TRẠNG THÁI / GHI CHÚ XỬ LÝ (Staff/Admin)
    updateContactStatus: async (req, res) => {
        try {
            const { contactId } = req.params;
            const { status, notes } = req.body;
            const adminId = req.user._id; // Lấy ID của Admin từ token đăng nhập

            const contact = await Contact.findById(contactId);
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu yêu cầu này' });
            }

            // Kiểm tra chuyển đổi trạng thái tuần tự
            if (status && status !== contact.status) {
                const validStatuses = ['Chưa xử lý', 'Đang xử lý', 'Đã xử lý', 'Đã hủy'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
                }

                // Chặn thay đổi trạng thái nếu phiếu đã giải quyết xong hoặc đã hủy
                if (contact.status === 'Đã xử lý' || contact.status === 'Đã hủy') {
                    return res.status(400).json({
                        success: false,
                        message: `Không thể thay đổi trạng thái của phiếu đã ở trạng thái "${contact.status}"`
                    });
                }

                const currentStatus = contact.status;
                if (status === 'Đang xử lý') {
                    if (currentStatus !== 'Chưa xử lý') {
                        return res.status(400).json({
                            success: false,
                            message: 'Chỉ có thể chuyển sang "Đang xử lý" khi trạng thái hiện tại là "Chưa xử lý"'
                        });
                    }
                } else if (status === 'Đã xử lý') {
                    if (currentStatus !== 'Đang xử lý') {
                        return res.status(400).json({
                            success: false,
                            message: 'Chỉ có thể chuyển sang "Đã xử lý" khi trạng thái hiện tại là "Đang xử lý"'
                        });
                    }
                } else if (status === 'Chưa xử lý') {
                    return res.status(400).json({
                        success: false,
                        message: 'Không thể chuyển trạng thái quay trở lại "Chưa xử lý"'
                    });
                } else if (status === 'Đã hủy') {
                    // Kiểm tra quyền hủy: chỉ có admin hoặc chính user tạo phiếu đó mới được phép
                    const isAdmin = req.user.role === 'admin';
                    const isCreator = (contact.user && contact.user.toString() === req.user._id.toString()) || 
                                      (contact.email && contact.email.toLowerCase() === req.user.email.toLowerCase());

                    if (!isAdmin && !isCreator) {
                        return res.status(403).json({
                            success: false,
                            message: 'Quyền truy cập bị từ chối: Chỉ có Admin hoặc chính người tạo phiếu mới có quyền hủy'
                        });
                    }
                }

                contact.status = status;
            }

            if (notes !== undefined) contact.notes = notes;
            contact.processedBy = adminId;

            await contact.save();

            return res.status(200).json({
                success: true,
                message: 'Cập nhật trạng thái phiếu hỗ trợ thành công',
                data: contact
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 4. XÓA MỀM PHIẾU HỖ TRỢ (Hủy phiếu - Chỉ dành cho Admin hoặc chính người tạo phiếu)
    softDeleteContact: async (req, res) => {
        try {
            const { contactId } = req.params;
            
            const contact = await Contact.findById(contactId);
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu yêu cầu' });
            }

            // Kiểm tra quyền hủy: chỉ có admin hoặc chính user tạo phiếu đó mới được phép
            const isAdmin = req.user.role === 'admin';
            const isCreator = (contact.user && contact.user.toString() === req.user._id.toString()) || 
                              (contact.email && contact.email.toLowerCase() === req.user.email.toLowerCase());

            if (!isAdmin && !isCreator) {
                return res.status(403).json({
                    success: false,
                    message: 'Quyền truy cập bị từ chối: Chỉ có Admin hoặc chính người tạo phiếu mới có quyền hủy'
                });
            }

            // Chặn hủy nếu phiếu đã giải quyết xong
            if (contact.status === 'Đã xử lý') {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy phiếu hỗ trợ đã được xử lý xong'
                });
            }

            contact.status = 'Đã hủy';
            contact.processedBy = req.user._id;
            await contact.save();

            return res.status(200).json({ success: true, message: 'Đã hủy phiếu hỗ trợ thành công', data: contact });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 5. XÓA VĨNH VIỄN PHIẾU HỖ TRỢ (Admin - Dùng khi bị spam mail rác)
    deleteContact: async (req, res) => {
        try {
            const { contactId } = req.params;

            const contact = await Contact.findByIdAndDelete(contactId);
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu để xóa' });
            }

            return res.status(200).json({ success: true, message: 'Xóa phiếu hỗ trợ thành công' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};