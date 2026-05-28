const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'backend_all_code.txt');
// Các thư mục hoặc file muốn bỏ qua không gom vào file text
const ignoreList = ['node_modules', '.git', '.gitignore', 'AGENTS.MD', 'package-lock.json', 'backend_all_code.txt', 'merge-code.cjs'];

fs.writeFileSync(outputFile, ''); // Xóa trắng file cũ nếu có

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (ignoreList.some(ignore => fullPath.includes(ignore))) return;

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile()) {
            const relativePath = path.relative(__dirname, fullPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            // Ghi tiêu đề file và nội dung vào file tổng
            fs.appendFileSync(outputFile, `\n\n=== START OF FILE: ${relativePath} ===\n\n${content}\n=== END OF FILE: ${relativePath} ===\n`);
        }
    });
}

scanDirectory(__dirname);
console.log('Đã gom code thành công vào file backend_all_code.txt!');