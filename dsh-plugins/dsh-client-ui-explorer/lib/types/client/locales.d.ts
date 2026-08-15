/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly refresh: "刷新";
    readonly open: "打开文件树";
    readonly close: "关闭文件树";
    readonly loading: "加载中…";
    readonly empty: "（空目录）";
    readonly truncated: "（目录过大，仅显示部分）";
    readonly noFolder: "未选择工作区目录";
    readonly searchPlaceholder: "搜索文件…";
    readonly searching: "搜索中…";
    readonly noResults: "无匹配结果";
    readonly clear: "清除";
    readonly expandAll: "全部展开";
    readonly collapseAll: "全部折叠";
    readonly closePreview: "关闭预览";
    readonly binaryFile: "二进制文件，暂不支持预览";
    readonly previewTruncated: "（文件过大，仅显示前 512KB）";
    readonly gitModified: "已修改";
    readonly gitAdded: "已新增";
    readonly gitUntracked: "未跟踪";
    readonly gitDeleted: "已删除";
    readonly gitRenamed: "已重命名";
    readonly gitDirty: "包含变更";
    readonly diff: "git 对照";
    readonly diffBack: "返回文件";
};
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<keyof typeof zh, string>;
