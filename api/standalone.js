export default async function handler(req, res) {
  try {
    // 同时获取两个库的最新代码
    const [mammothRes, html2pdfRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'),
      fetch('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js')
    ]);
    if (!mammothRes.ok || !html2pdfRes.ok) {
      throw new Error('库文件获取失败');
    }
    const mammothJS = await mammothRes.text();
    const html2pdfJS = await html2pdfRes.text();

    // 构建完整的单文件 HTML（包含内嵌的库和转换界面）
    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Word 转 PDF（离线）</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center;
            padding: 20px;
            background: #f9f9f9;
        }
        .btn {
            background: #007aff;
            color: white;
            padding: 14px 30px;
            border-radius: 10px;
            font-size: 18px;
            border: none;
        }
        #msg { margin-top: 20px; color: #333; }
    </style>
    <script>${mammothJS}<\\/script>
    <script>${html2pdfJS}<\\/script>
</head>
<body>
    <h3>📄 Word 转 PDF</h3>
    <p>选择手机中的 .docx 文件，直接转换为 PDF<br><small>（完全离线，无需联网）</small></p>
    <input type="file" id="fileInput" accept=".docx" style="display:none">
    <button class="btn" onclick="document.getElementById('fileInput').click()">选择 Word 文件</button>
    <div id="msg"></div>

    <script>
        document.getElementById('fileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const msg = document.getElementById('msg');
            msg.innerText = '正在读取文件...';

            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                const htmlContent = result.value;
                if (!htmlContent.trim()) {
                    msg.innerText = '文档内容为空，无法转换。';
                    return;
                }

                // 创建隐藏元素用于导出 PDF
                const div = document.createElement('div');
                div.innerHTML = htmlContent;
                div.style.position = 'absolute';
                div.style.left = '-9999px';
                div.style.top = '0';
                div.style.width = '210mm';
                document.body.appendChild(div);
                msg.innerText = '正在生成 PDF...';

                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: file.name.replace(/\\.docx$/i, '') + '.pdf',
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                await html2pdf().set(opt).from(div).save();
                document.body.removeChild(div);
                msg.innerText = '✅ PDF 已生成并下载！';
            } catch (err) {
                console.error(err);
                msg.innerText = '转换失败：' + err.message;
            }
        });
    </script>
</body>
</html>`;

    // 强制浏览器下载文件
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="word2pdf-offline.html"');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
