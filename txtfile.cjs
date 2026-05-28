const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'backend_routes_code.txt');
const ignoreList = ['node_modules', '.git', '.gitignore', 'package-lock.json', 'backend_routes_code.txt', 'merge-code.cjs'];

fs.writeFileSync(outputFile, ''); // Xóa trắng file cũ nếu có

function cleanCode(content) {
    let cleaned = content;

    // 1. Xóa comment khối /* ... */ và comment dòng // ...
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    // 2. Xóa các dòng chứa require hoặc import (bao gồm cả khoảng trắng ở đầu dòng)
    cleaned = cleaned.replace(/^\s*(const|let|var)?.*=.*require\(.*\);?\s*$/gm, '');
    cleaned = cleaned.replace(/^\s*import\s+.*?\s+from\s+['"].*?['"];?\s*$/gm, '');
    // Hỗ trợ thêm kiểu import không gán biến hoặc import dạng block nếu có
    cleaned = cleaned.replace(/^\s*import\s+['"].*?['"];?\s*$/gm, '');

    // 3. Xóa các dòng trống hoàn toàn hoặc chỉ chứa khoảng trắng, thu gọn nhiều dòng trống thành 1 dòng single newline
    cleaned = cleaned.replace(/^\s*[\r\n]/gm, '');

    return cleaned.trim();
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (ignoreList.some(ignore => fullPath.includes(ignore))) return;

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile()) {
            if (file.endsWith('.route.js') || file.endsWith('.model.js')) {
                const relativePath = path.relative(__dirname, fullPath);
                const rawContent = fs.readFileSync(fullPath, 'utf8');

                // Tiến hành "lọc sạch" nội dung file
                const processedContent = cleanCode(rawContent);

                // Chỉ ghi vào file tổng nếu file route sau khi lọc vẫn còn nội dung
                if (processedContent) {
                    fs.appendFileSync(
                        outputFile,
                        `\n=== START OF FILE: ${relativePath} ===\n${processedContent}\n=== END OF FILE: ${relativePath} ===\n`
                    );
                }
            }
        }
    });
}

scanDirectory(__dirname);
console.log('Đã lọc sạch comment, import, dòng trống và gom code thành công!');