/**
 * Script migration: Tự động cập nhật ghnDistrictId cho tất cả chi nhánh
 * Dùng API GHN để lookup quận/huyện từ tên địa chỉ chi nhánh.
 *
 * Cách chạy: node scripts/seed-branch-ghn.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env từ thư mục gốc backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';

const GHN_API_URL = process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api';
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';
const MONGO_URI = process.env.MONGODB_CONNECTION_STRING || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/didongviet';

// Schema branch tối giản (không cần import model để tránh alias issues)
const branchSchema = new mongoose.Schema({
    name: String,
    address: String,
    phone: String,
    ghnDistrictId: { type: Number, default: 0 },
    ghnWardCode: { type: String, default: '' },
    ghnFromName: { type: String, default: '' },
    ghnFromPhone: { type: String, default: '' },
}, { timestamps: true, collection: 'branches' });

const Branch = mongoose.model('Branch', branchSchema);

/**
 * Gọi API GHN
 */
async function callGHN(endpoint, method = 'GET', body = null) {
    const url = `${GHN_API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN,
        'ShopId': GHN_SHOP_ID,
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();

    // Debug: log response nếu có lỗi
    if (data.code !== 200) {
        console.warn(`   ⚠️  GHN API lỗi (${endpoint}): code=${data.code}, message=${data.message}`);
    }

    return data;
}

/**
 * Lookup danh sách tỉnh/thành phố
 */
async function getProvinces() {
    const data = await callGHN('/master-data/province');
    return data.data || [];
}

/**
 * Lookup quận/huyện theo province_id
 */
async function getDistricts(provinceId) {
    const data = await callGHN('/master-data/district', 'POST', { province_id: provinceId });
    return data.data || [];
}

/**
 * Helper: lấy field PascalCase hoặc snake_case từ object GHN API
 */
function getField(obj, pascalKey, snakeKey, fallback = '') {
    return obj[pascalKey] ?? obj[snakeKey] ?? fallback;
}

/**
 * Trích xuất tên tỉnh từ địa chỉ chi nhánh
 */
function extractProvinceName(address) {
    const addr = address.toLowerCase();
    const mappings = [
        { keywords: ['hồ chí minh', 'hcm', 'tphcm'], name: 'Hồ Chí Minh' },
        { keywords: ['hà nội', 'hn'], name: 'Hà Nội' },
        { keywords: ['đà nẵng', 'đn'], name: 'Đà Nẵng' },
        { keywords: ['bình dương', 'bd'], name: 'Bình Dương' },
        { keywords: ['đồng nai'], name: 'Đồng Nai' },
        { keywords: ['hải phòng'], name: 'Hải Phòng' },
        { keywords: ['khánh hòa', 'nha trang'], name: 'Khánh Hòa' },
        { keywords: ['quảng ninh'], name: 'Quảng Ninh' },
        { keywords: ['thanh hóa'], name: 'Thanh Hóa' },
        { keywords: ['nghệ an', 'vinh'], name: 'Nghệ An' },
        { keywords: ['đắk lắk', 'buôn ma thuột'], name: 'Đắk Lắk' },
        { keywords: ['lâm đồng', 'đà lạt'], name: 'Lâm Đồng' },
        { keywords: ['cần thơ'], name: 'Cần Thơ' },
        { keywords: ['bà rịa'], name: 'Bà Rịa - Vũng Tàu' },
        { keywords: ['tây ninh'], name: 'Tây Ninh' },
        { keywords: ['long an'], name: 'Long An' },
        { keywords: ['tiền giang'], name: 'Tiền Giang' },
        { keywords: ['bình định', 'quy nhơn'], name: 'Bình Định' },
        { keywords: ['quảng nam', 'tam kỳ'], name: 'Quảng Nam' },
        { keywords: ['thừa thiên huế', 'huế'], name: 'Thừa Thiên Huế' },
    ];

    for (const m of mappings) {
        if (m.keywords.some(k => addr.includes(k))) return m.name;
    }

    // Fallback: tìm tên tỉnh cuối cùng trong chuỗi (thường là phần cuối địa chỉ)
    const parts = addr.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];
    return lastPart || 'Hồ Chí Minh';
}

/**
 * Trích xuất tên quận/huyện từ địa chỉ chi nhánh
 * Giả sử format: "Di Động Việt - [Tên đường], [Quận/Huyện], [Tỉnh/TP]"
 */
function extractDistrictName(address) {
    const parts = address.split(',').map(p => p.trim());
    // Quận/huyện thường là phần thứ 2 từ cuối (trước tỉnh)
    if (parts.length >= 3) {
        return parts[parts.length - 2];
    }
    // Nếu ít phần, thử tách bằng dấu "-"
    const dashParts = address.split('-').map(p => p.trim());
    if (dashParts.length >= 2) {
        return dashParts[dashParts.length - 1].split(',')[0].trim();
    }
    return '';
}

async function main() {
    console.log('🔗 Đang kết nối MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    // 1. Lấy tất cả chi nhánh
    const branches = await Branch.find({});
    console.log(`📦 Tìm thấy ${branches.length} chi nhánh\n`);

    if (branches.length === 0) {
        console.log('⚠️  Không có chi nhánh nào trong database.');
        await mongoose.disconnect();
        return;
    }

    // 2. Load danh sách tỉnh từ GHN
    console.log('🌐 Đang tải danh sách tỉnh từ GHN...');
    const provinces = await getProvinces();
    console.log(`✅ Có ${provinces.length} tỉnh/thành phố\n`);

    // Cache districts theo province_id
    const districtCache = {};

    let updatedCount = 0;

    for (const branch of branches) {
        console.log(`\n--- Chi nhánh: ${branch.name} ---`);
        console.log(`   Địa chỉ: ${branch.address}`);

        // Trích xuất tên tỉnh
        const provinceName = extractProvinceName(branch.address);
        console.log(`   Tỉnh detected: ${provinceName}`);

        // Tìm province_id (GHN API dùng PascalCase: ProvinceName, ProvinceID)
        // Ưu tiên exact match trước, sau đó mới fuzzy
        let province = provinces.find(p => {
            const name = getField(p, 'ProvinceName', 'province_name');
            return name.toLowerCase() === provinceName.toLowerCase();
        });
        if (!province) {
            province = provinces.find(p => {
                const name = getField(p, 'ProvinceName', 'province_name');
                return name.toLowerCase().includes(provinceName.toLowerCase()) ||
                    provinceName.toLowerCase().includes(name.toLowerCase());
            });
        }

        if (!province) {
            console.log(`   ❌ Không tìm thấy tỉnh "${provinceName}" trong GHN`);
            continue;
        }

        const provinceId = getField(province, 'ProvinceID', 'province_id');
        console.log(`   Province ID: ${provinceId}`);

        // Load districts nếu chưa cache
        if (!districtCache[provinceId]) {
            const provName = getField(province, 'ProvinceName', 'province_name');
            console.log(`   🌐 Đang tải danh sách quận/huyện cho ${provName}...`);
            districtCache[provinceId] = await getDistricts(provinceId);
            // Delay nhẹ để tránh rate limit
            await new Promise(r => setTimeout(r, 300));
        }

        const districts = districtCache[provinceId];

        // Trích xuất tên quận/huyện
        const districtName = extractDistrictName(branch.address);
        console.log(`   Quận/Huyện detected: ${districtName || '(không detect được)'}`);

        // Tìm district_id bằng fuzzy match (GHN API dùng PascalCase: DistrictName, DistrictID)
        let matchedDistrict = null;

        if (districtName) {
            // Thử match chính xác trước
            matchedDistrict = districts.find(d => {
                const name = getField(d, 'DistrictName', 'district_name');
                return name.toLowerCase() === districtName.toLowerCase();
            });

            // Nếu không match, thử fuzzy
            if (!matchedDistrict) {
                matchedDistrict = districts.find(d => {
                    const name = getField(d, 'DistrictName', 'district_name');
                    return name.toLowerCase().includes(districtName.toLowerCase()) ||
                        districtName.toLowerCase().includes(name.toLowerCase());
                });
            }
        }

        if (!matchedDistrict) {
            console.log(`   ❌ Không tìm thấy quận/huyện "${districtName}" trong danh sách GHN`);
            const names = districts.map(d => getField(d, 'DistrictName', 'district_name'));
            console.log(`   Danh sách: ${names.join(', ')}`);
            continue;
        }

        const matchedName = getField(matchedDistrict, 'DistrictName', 'district_name');
        const matchedId = getField(matchedDistrict, 'DistrictID', 'district_id');
        console.log(`   ✅ Matched: ${matchedName} (ID: ${matchedId})`);

        // Cập nhật branch
        const oldDistrictId = branch.ghnDistrictId;
        branch.ghnDistrictId = matchedId;
        branch.ghnFromName = branch.ghnFromName || branch.name;
        branch.ghnFromPhone = branch.ghnFromPhone || branch.phone;
        await branch.save();

        if (oldDistrictId !== matchedId) {
            console.log(`   🔄 Đã cập nhật: ghnDistrictId ${oldDistrictId} → ${matchedId}`);
            updatedCount++;
        } else {
            console.log(`   ✓ Đã có sẵn ghnDistrictId = ${matchedId}`);
        }
    }

    console.log(`\n🎉 Hoàn tất! Đã cập nhật ${updatedCount}/${branches.length} chi nhánh.`);

    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
}

main().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});