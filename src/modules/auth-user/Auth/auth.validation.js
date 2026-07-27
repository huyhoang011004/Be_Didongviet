import Joi from 'joi';

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Vui lòng nhập email',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Vui lòng nhập email'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Vui lòng nhập mật khẩu',
        'any.required': 'Vui lòng nhập mật khẩu'
    })
});

export const googleLoginSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    googleId: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    otpCode: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
});
