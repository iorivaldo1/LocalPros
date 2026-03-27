const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SAVE_DIR = 'E:\\temp\\0117';

// 确保保存目录存在
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    console.log(`创建目录: ${SAVE_DIR}`);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'image/png', limit: '50mb' }));

// 保存图片接口
app.post('/save-image', async (req, res) => {
    try {
        const { imageData, filename } = req.body;
        
        if (!imageData || !filename) {
            return res.status(400).json({ error: '缺少图片数据或文件名' });
        }

        // 移除 base64 前缀
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const filepath = path.join(SAVE_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        
        console.log(`图片已保存: ${filepath}`);
        res.json({ success: true, path: filepath });
    } catch (error) {
        console.error('保存图片失败:', error);
        res.status(500).json({ error: '保存失败', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`图片保存路径: ${SAVE_DIR}`);
});
