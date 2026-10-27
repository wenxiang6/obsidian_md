// open‑memo‑today.js Templater User Script
async function openMemoToday(tp) {
  // 你的目标文件夹名称
  const memoFolder = "备忘录";
  const todayFileName = tp.date.now("YYYY‑MM‑DD") + ".md";

  // 遍历全部md文件
  const allFiles = app.vault.getMarkdownFiles();
  const targetFile = allFiles.find(f => {
    return f.parent?.path === memoFolder && f.name === todayFileName;
  });

  if (targetFile) {
    // 在新标签打开
    const leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(targetFile);
    new Notice(`✅打开今日备忘录：${todayFileName}`);
  } else {
    new Notice(`⚠️备忘录文件夹找不到：${todayFileName}`);
  }
}

module.exports = openMemoToday;
