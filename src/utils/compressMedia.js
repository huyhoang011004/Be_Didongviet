import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Nén ảnh xuống kích thước tối đa (maxWidth) và chất lượng tối ưu
 * Kích thước tối đa: 2MB, width tối đa: 1080px
 */
export async function compressImage(inputPath, outputPath, options = {}) {
    const { maxWidth = 1080, maxSizeMB = 2 } = options;

    let quality = 80;
    let buffer = await sharp(inputPath)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

    // Nếu vẫn > maxSizeMB, giảm quality dần
    while (buffer.length > maxSizeMB * 1024 * 1024 && quality > 20) {
        quality -= 10;
        buffer = await sharp(inputPath)
            .resize({ width: maxWidth, withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
    }

    // Nếu vẫn > maxSizeMB, giảm width dần
    let width = maxWidth;
    while (buffer.length > maxSizeMB * 1024 * 1024 && width > 200) {
        width -= 100;
        buffer = await sharp(inputPath)
            .resize({ width, withoutEnlargement: true })
            .jpeg({ quality: Math.max(quality, 30), mozjpeg: true })
            .toBuffer();
    }

    // Xác định output extension dựa trên format
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === '.png') {
        buffer = await sharp(inputPath)
            .resize({ width: maxWidth, withoutEnlargement: true })
            .png({ compressionLevel: 9 })
            .toBuffer();
    } else if (ext === '.webp') {
        buffer = await sharp(inputPath)
            .resize({ width: maxWidth, withoutEnlargement: true })
            .webp({ quality })
            .toBuffer();
    }

    await fs.promises.writeFile(outputPath, buffer);
    return outputPath;
}

/**
 * Nén video xuống 720p (max 1 phút)
 * Sử dụng fluent-ffmpeg
 */
export async function compressVideo(inputPath, outputPath) {
    // Sử dụng dynamic import vì fluent-ffmpeg có thể không cài được ffmpeg system
    let ffmpeg;
    try {
        ffmpeg = (await import('fluent-ffmpeg')).default;
    } catch (e) {
        console.warn('fluent-ffmpeg not available, copying video without compression');
        await fs.promises.copyFile(inputPath, outputPath);
        return outputPath;
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .size('1280x720')
            .autopad()
            .outputOptions([
                '-preset medium',
                '-crf 28',
                '-t 60', // max 1 phút
                '-movflags +faststart',
            ])
            .audioCodec('aac')
            .audioBitrate(128)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Error compressing video:', err);
                // Fallback: copy file gốc
                fs.promises.copyFile(inputPath, outputPath).then(() => resolve(outputPath));
            })
            .save(outputPath);
    });
}

/**
 * Validate video duration (max 60 giây)
 */
export async function getVideoDuration(filePath) {
    let ffmpeg;
    try {
        ffmpeg = (await import('fluent-ffmpeg')).default;
    } catch (e) {
        return 0; // Không check được, bỏ qua
    }

    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                console.error('ffprobe error:', err);
                resolve(0);
            } else {
                resolve(metadata?.format?.duration || 0);
            }
        });
    });
}