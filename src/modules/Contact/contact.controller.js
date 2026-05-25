import Contact from './contact.model.js';

export const contactController = {
    // 1. GỬI YÊU CẦU LIÊN HỆ (Public - Dành cho khách hàng trên Website)
    submitContact: async (req, res) => {
        try {
            const { fullName, email, phone, subject, message } = req.body;

            // Validate cơ bản đầu vào
            if (!fullName || !email || !phone || !message) {
                return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
            }

            const newContact = await Contact.create({
                fullName,
                email,
                phone,
                subject,
                message
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

    // 3. CẬP NHẬT TRẠNG THÁI / GHI CHÚ XỬ LÝ (Admin Only)
    // Dùng khi nhân viên gọi điện hỗ trợ xong và chuyển trạng thái sang "Đã giải quyết"
    updateContactStatus: async (req, res) => {
        try {
            const { contactId } = req.params;
            const { status, notes } = req.body;
            const adminId = req.user._id; // Lấy ID của Admin từ token đăng nhập

            const contact = await Contact.findById(contactId);
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu yêu cầu này' });
            }

            // Cập nhật các thông tin xử lý nội bộ
            if (status) contact.status = status;
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

    // 4. XÓA PHIẾU HỖ TRỢ (Admin Only - Dùng khi bị spam mail rác)
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