import { createElement } from "./solidDomRuntime.js";
import { LUCIDE_ICON_NODES } from "./icons/lucideNodes.js";

export function createSolidLucideIcon(name, nodes = []) {
  const IconComponent = ({ size = 24, color = "currentColor", strokeWidth = 2, className = "", style, children, ...rest } = {}) => {
    const svgChildren = (nodes || []).map(([tag, attrs], idx) =>
      createElement(tag, { ...attrs, key: attrs.key || idx })
    );
    if (children) svgChildren.push(children);
    return createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className: ["lucide", `lucide-${name.toLowerCase()}`, className].filter(Boolean).join(" "),
        style,
        ...rest,
      },
      ...svgChildren
    );
  };
  IconComponent.displayName = name;
  return IconComponent;
}

export const Activity = createSolidLucideIcon("Activity", LUCIDE_ICON_NODES["Activity"]);
export const AlertCircle = createSolidLucideIcon("AlertCircle", LUCIDE_ICON_NODES["AlertCircle"]);
export const AlertTriangle = createSolidLucideIcon("AlertTriangle", LUCIDE_ICON_NODES["AlertTriangle"]);
export const AlignJustify = createSolidLucideIcon("AlignJustify", LUCIDE_ICON_NODES["AlignJustify"]);
export const AlignLeft = createSolidLucideIcon("AlignLeft", LUCIDE_ICON_NODES["AlignLeft"]);
export const AppWindow = createSolidLucideIcon("AppWindow", LUCIDE_ICON_NODES["AppWindow"]);
export const ArrowDown = createSolidLucideIcon(
  "ArrowDown",
  LUCIDE_ICON_NODES["ArrowDown"] || [
    ["path", { d: "M12 5v14", key: "s699le" }],
    ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }],
  ]
);
export const ArrowDownCircle = createSolidLucideIcon("ArrowDownCircle", LUCIDE_ICON_NODES["ArrowDownCircle"]);
export const ArrowDownToLine = createSolidLucideIcon("ArrowDownToLine", LUCIDE_ICON_NODES["ArrowDownToLine"]);
export const ArrowLeft = createSolidLucideIcon("ArrowLeft", LUCIDE_ICON_NODES["ArrowLeft"]);
export const ArrowRight = createSolidLucideIcon("ArrowRight", LUCIDE_ICON_NODES["ArrowRight"]);
export const ArrowUp = createSolidLucideIcon("ArrowUp", LUCIDE_ICON_NODES["ArrowUp"]);
export const ArrowUpDown = createSolidLucideIcon("ArrowUpDown", LUCIDE_ICON_NODES["ArrowUpDown"]);
export const Award = createSolidLucideIcon("Award", LUCIDE_ICON_NODES["Award"]);
export const BarChart3 = createSolidLucideIcon("BarChart3", LUCIDE_ICON_NODES["BarChart3"]);
export const Bell = createSolidLucideIcon("Bell", LUCIDE_ICON_NODES["Bell"]);
export const BellOff = createSolidLucideIcon("BellOff", LUCIDE_ICON_NODES["BellOff"]);
export const Blocks = createSolidLucideIcon("Blocks", LUCIDE_ICON_NODES["Blocks"]);
export const Bold = createSolidLucideIcon(
  "Bold",
  LUCIDE_ICON_NODES["Bold"] || [
    ["path", { d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8", key: "mg9rjx" }],
  ]
);
export const BookOpen = createSolidLucideIcon("BookOpen", LUCIDE_ICON_NODES["BookOpen"]);
export const Bot = createSolidLucideIcon("Bot", LUCIDE_ICON_NODES["Bot"]);
export const Box = createSolidLucideIcon("Box", LUCIDE_ICON_NODES["Box"]);
export const Braces = createSolidLucideIcon("Braces", LUCIDE_ICON_NODES["Braces"]);
export const Brain = createSolidLucideIcon("Brain", LUCIDE_ICON_NODES["Brain"]);
export const Calendar = createSolidLucideIcon("Calendar", LUCIDE_ICON_NODES["Calendar"]);
export const CalendarDays = createSolidLucideIcon("CalendarDays", LUCIDE_ICON_NODES["CalendarDays"]);
export const Camera = createSolidLucideIcon("Camera", LUCIDE_ICON_NODES["Camera"]);
export const Check = createSolidLucideIcon("Check", LUCIDE_ICON_NODES["Check"]);
export const CheckCheck = createSolidLucideIcon("CheckCheck", LUCIDE_ICON_NODES["CheckCheck"]);
export const CheckCircle2 = createSolidLucideIcon("CheckCircle2", LUCIDE_ICON_NODES["CheckCircle2"]);
export const CheckSquare = createSolidLucideIcon("CheckSquare", LUCIDE_ICON_NODES["CheckSquare"]);
export const ChevronDown = createSolidLucideIcon("ChevronDown", LUCIDE_ICON_NODES["ChevronDown"]);
export const ChevronLeft = createSolidLucideIcon("ChevronLeft", LUCIDE_ICON_NODES["ChevronLeft"]);
export const ChevronRight = createSolidLucideIcon("ChevronRight", LUCIDE_ICON_NODES["ChevronRight"]);
export const ChevronUp = createSolidLucideIcon("ChevronUp", LUCIDE_ICON_NODES["ChevronUp"]);
export const Circle = createSolidLucideIcon("Circle", LUCIDE_ICON_NODES["Circle"]);
export const CircleDot = createSolidLucideIcon("CircleDot", LUCIDE_ICON_NODES["CircleDot"]);
export const CircleSlash = createSolidLucideIcon(
  "CircleSlash",
  LUCIDE_ICON_NODES["CircleSlash"] || [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["line", { x1: "9", x2: "15", y1: "15", y2: "9", key: "1dfufj" }],
  ]
);
export const Clipboard = createSolidLucideIcon("Clipboard", LUCIDE_ICON_NODES["Clipboard"]);
export const Clock = createSolidLucideIcon("Clock", LUCIDE_ICON_NODES["Clock"]);
export const Cloud = createSolidLucideIcon(
  "Cloud",
  LUCIDE_ICON_NODES["Cloud"] || [
    ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }],
  ]
);
export const Code = createSolidLucideIcon("Code", LUCIDE_ICON_NODES["Code"]);
export const Code2 = createSolidLucideIcon("Code2", LUCIDE_ICON_NODES["Code2"]);
export const Coffee = createSolidLucideIcon("Coffee", LUCIDE_ICON_NODES["Coffee"]);
export const Coins = createSolidLucideIcon("Coins", LUCIDE_ICON_NODES["Coins"]);
export const Columns = createSolidLucideIcon("Columns", LUCIDE_ICON_NODES["Columns"]);
export const Columns2 = createSolidLucideIcon("Columns2", LUCIDE_ICON_NODES["Columns2"]);
export const Command = createSolidLucideIcon("Command", LUCIDE_ICON_NODES["Command"]);
export const Copy = createSolidLucideIcon("Copy", LUCIDE_ICON_NODES["Copy"]);
export const CopyPlus = createSolidLucideIcon(
  "CopyPlus",
  LUCIDE_ICON_NODES["CopyPlus"] || [
    ["line", { x1: "15", x2: "15", y1: "12", y2: "18" }],
    ["line", { x1: "12", x2: "18", y1: "15", y2: "15" }],
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
  ]
);
export const CornerDownLeft = createSolidLucideIcon("CornerDownLeft", LUCIDE_ICON_NODES["CornerDownLeft"]);
export const CornerDownRight = createSolidLucideIcon("CornerDownRight", LUCIDE_ICON_NODES["CornerDownRight"]);
export const Cpu = createSolidLucideIcon("Cpu", LUCIDE_ICON_NODES["Cpu"]);
export const Crosshair = createSolidLucideIcon("Crosshair", LUCIDE_ICON_NODES["Crosshair"]);
export const Database = createSolidLucideIcon("Database", LUCIDE_ICON_NODES["Database"]);
export const DollarSign = createSolidLucideIcon("DollarSign", LUCIDE_ICON_NODES["DollarSign"]);
export const Download = createSolidLucideIcon("Download", LUCIDE_ICON_NODES["Download"]);
export const ExternalLink = createSolidLucideIcon("ExternalLink", LUCIDE_ICON_NODES["ExternalLink"]);
export const Eye = createSolidLucideIcon("Eye", LUCIDE_ICON_NODES["Eye"]);
export const EyeOff = createSolidLucideIcon("EyeOff", LUCIDE_ICON_NODES["EyeOff"]);
export const FileCode = createSolidLucideIcon("FileCode", LUCIDE_ICON_NODES["FileCode"]);
export const FileCode2 = createSolidLucideIcon(
  "FileCode2",
  LUCIDE_ICON_NODES["FileCode2"] || [
    ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { d: "m5 12-3 3 3 3" }],
    ["path", { d: "m9 18 3-3-3-3" }],
  ]
);
export const FileDiff = createSolidLucideIcon("FileDiff", LUCIDE_ICON_NODES["FileDiff"]);
export const FilePlus = createSolidLucideIcon(
  "FilePlus",
  LUCIDE_ICON_NODES["FilePlus"] || [
    ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { d: "M9 15h6" }],
    ["path", { d: "M12 18v-6" }],
  ]
);
export const FileSpreadsheet = createSolidLucideIcon("FileSpreadsheet", LUCIDE_ICON_NODES["FileSpreadsheet"]);
export const FileText = createSolidLucideIcon("FileText", LUCIDE_ICON_NODES["FileText"]);
export const Files = createSolidLucideIcon("Files", LUCIDE_ICON_NODES["Files"]);
export const Filter = createSolidLucideIcon("Filter", LUCIDE_ICON_NODES["Filter"]);
export const Flag = createSolidLucideIcon(
  "Flag",
  LUCIDE_ICON_NODES["Flag"] || [
    ["path", { d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", key: "flag-body" }],
    ["line", { x1: "4", x2: "4", y1: "22", y2: "15", key: "flag-pole" }],
  ]
);
export const FlaskConical = createSolidLucideIcon("FlaskConical", LUCIDE_ICON_NODES["FlaskConical"]);
export const Folder = createSolidLucideIcon("Folder", LUCIDE_ICON_NODES["Folder"]);
export const FolderGit2 = createSolidLucideIcon("FolderGit2", LUCIDE_ICON_NODES["FolderGit2"]);
export const FolderOpen = createSolidLucideIcon("FolderOpen", LUCIDE_ICON_NODES["FolderOpen"]);
export const FolderPlus = createSolidLucideIcon("FolderPlus", LUCIDE_ICON_NODES["FolderPlus"]);
export const FolderTree = createSolidLucideIcon("FolderTree", LUCIDE_ICON_NODES["FolderTree"]);
export const Gauge = createSolidLucideIcon("Gauge", LUCIDE_ICON_NODES["Gauge"]);
export const Gift = createSolidLucideIcon("Gift", LUCIDE_ICON_NODES["Gift"]);
export const GitBranch = createSolidLucideIcon("GitBranch", LUCIDE_ICON_NODES["GitBranch"]);
export const GitCompare = createSolidLucideIcon("GitCompare", LUCIDE_ICON_NODES["GitCompare"]);
export const GitFork = createSolidLucideIcon("GitFork", LUCIDE_ICON_NODES["GitFork"]);
export const GitPullRequest = createSolidLucideIcon("GitPullRequest", LUCIDE_ICON_NODES["GitPullRequest"]);
export const Globe = createSolidLucideIcon("Globe", LUCIDE_ICON_NODES["Globe"]);
export const Grid = createSolidLucideIcon("Grid", LUCIDE_ICON_NODES["Grid"]);
export const Grid2X2 = createSolidLucideIcon("Grid2X2", LUCIDE_ICON_NODES["Grid2X2"]);
export const GripHorizontal = createSolidLucideIcon(
  "GripHorizontal",
  LUCIDE_ICON_NODES["GripHorizontal"] || [
    ["circle", { cx: "12", cy: "9", r: "1", key: "129" }],
    ["circle", { cx: "19", cy: "9", r: "1", key: "199" }],
    ["circle", { cx: "5", cy: "9", r: "1", key: "59" }],
    ["circle", { cx: "12", cy: "15", r: "1", key: "1215" }],
    ["circle", { cx: "19", cy: "15", r: "1", key: "1915" }],
    ["circle", { cx: "5", cy: "15", r: "1", key: "515" }],
  ]
);
export const GripVertical = createSolidLucideIcon(
  "GripVertical",
  LUCIDE_ICON_NODES["GripVertical"] || [
    ["circle", { cx: "9", cy: "12", r: "1", key: "912" }],
    ["circle", { cx: "9", cy: "5", r: "1", key: "95" }],
    ["circle", { cx: "9", cy: "19", r: "1", key: "919" }],
    ["circle", { cx: "15", cy: "12", r: "1", key: "1512" }],
    ["circle", { cx: "15", cy: "5", r: "1", key: "155" }],
    ["circle", { cx: "15", cy: "19", r: "1", key: "1519" }],
  ]
);
export const HardDrive = createSolidLucideIcon("HardDrive", LUCIDE_ICON_NODES["HardDrive"]);
export const Heading1 = createSolidLucideIcon(
  "Heading1",
  LUCIDE_ICON_NODES["Heading1"] || [
    ["path", { d: "M4 12h8", key: "17cfdx" }],
    ["path", { d: "M4 18V6", key: "1rz3zl" }],
    ["path", { d: "M12 18V6", key: "zqpxq5" }],
    ["path", { d: "m17 12 3-2v8", key: "1hhhft" }],
  ]
);
export const Heading2 = createSolidLucideIcon(
  "Heading2",
  LUCIDE_ICON_NODES["Heading2"] || [
    ["path", { d: "M4 12h8", key: "17cfdx" }],
    ["path", { d: "M4 18V6", key: "1rz3zl" }],
    ["path", { d: "M12 18V6", key: "zqpxq5" }],
    ["path", { d: "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1", key: "9jr5yi" }],
  ]
);
export const Heading3 = createSolidLucideIcon(
  "Heading3",
  LUCIDE_ICON_NODES["Heading3"] || [
    ["path", { d: "M4 12h8", key: "17cfdx" }],
    ["path", { d: "M4 18V6", key: "1rz3zl" }],
    ["path", { d: "M12 18V6", key: "zqpxq5" }],
    ["path", { d: "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2", key: "68ncm8" }],
    ["path", { d: "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2", key: "1ejuhz" }],
  ]
);
export const Heading4 = createSolidLucideIcon(
  "Heading4",
  LUCIDE_ICON_NODES["Heading4"] || [
    ["path", { d: "M12 18V6", key: "zqpxq5" }],
    ["path", { d: "M17 10v3a1 1 0 0 0 1 1h3", key: "tj5zdr" }],
    ["path", { d: "M21 10v8", key: "1kdml4" }],
    ["path", { d: "M4 12h8", key: "17cfdx" }],
    ["path", { d: "M4 18V6", key: "1rz3zl" }],
  ]
);
export const Heading5 = createSolidLucideIcon(
  "Heading5",
  LUCIDE_ICON_NODES["Heading5"] || [
    ["path", { d: "M4 12h8", key: "17cfdx" }],
    ["path", { d: "M4 18V6", key: "1rz3zl" }],
    ["path", { d: "M12 18V6", key: "zqpxq5" }],
    ["path", { d: "M17 13v-3h4", key: "1nvgqp" }],
    ["path", { d: "M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17", key: "2nebdn" }],
  ]
);
export const HelpCircle = createSolidLucideIcon("HelpCircle", LUCIDE_ICON_NODES["HelpCircle"]);
export const History = createSolidLucideIcon(
  "History",
  LUCIDE_ICON_NODES["History"] || [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
    ["path", { d: "M12 7v5l4 2" }],
  ]
);
export const Home = createSolidLucideIcon("Home", LUCIDE_ICON_NODES["Home"]);
export const Image = createSolidLucideIcon("Image", LUCIDE_ICON_NODES["Image"]);
export const ImageIcon = createSolidLucideIcon("ImageIcon", LUCIDE_ICON_NODES["ImageIcon"]);
export const ImagePlus = createSolidLucideIcon(
  "ImagePlus",
  LUCIDE_ICON_NODES["ImagePlus"] || [
    ["path", { d: "M16 5h6", key: "165" }],
    ["path", { d: "M19 2v6", key: "192" }],
    ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5", key: "2111" }],
    ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "2115" }],
    ["circle", { cx: "9", cy: "9", r: "2", key: "992" }],
  ]
);
export const Info = createSolidLucideIcon("Info", LUCIDE_ICON_NODES["Info"]);
export const Italic = createSolidLucideIcon(
  "Italic",
  LUCIDE_ICON_NODES["Italic"] || [
    ["line", { x1: "19", x2: "10", y1: "4", y2: "4", key: "15jd3p" }],
    ["line", { x1: "14", x2: "5", y1: "20", y2: "20", key: "bu0au3" }],
    ["line", { x1: "15", x2: "9", y1: "4", y2: "20", key: "uljnxc" }],
  ]
);
export const Kanban = createSolidLucideIcon("Kanban", LUCIDE_ICON_NODES["Kanban"]);
export const Key = createSolidLucideIcon("Key", LUCIDE_ICON_NODES["Key"]);
export const Keyboard = createSolidLucideIcon(
  "Keyboard",
  LUCIDE_ICON_NODES["Keyboard"] || [
    ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
    ["path", { d: "M6 8h.001" }],
    ["path", { d: "M10 8h.001" }],
    ["path", { d: "M14 8h.001" }],
    ["path", { d: "M18 8h.001" }],
    ["path", { d: "M8 12h.001" }],
    ["path", { d: "M12 12h.001" }],
    ["path", { d: "M16 12h.001" }],
    ["path", { d: "M7 16h10" }],
  ]
);
export const Laptop = createSolidLucideIcon("Laptop", LUCIDE_ICON_NODES["Laptop"]);
export const Layers = createSolidLucideIcon("Layers", LUCIDE_ICON_NODES["Layers"]);
export const LayoutDashboard = createSolidLucideIcon("LayoutDashboard", LUCIDE_ICON_NODES["LayoutDashboard"]);
export const LayoutGrid = createSolidLucideIcon("LayoutGrid", LUCIDE_ICON_NODES["LayoutGrid"]);
export const LayoutList = createSolidLucideIcon("LayoutList", LUCIDE_ICON_NODES["LayoutList"]);
export const Link = createSolidLucideIcon(
  "Link",
  LUCIDE_ICON_NODES["Link"] || [
    ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", key: "1cjeqo" }],
    ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", key: "19qd67" }],
  ]
);
export const Link2 = createSolidLucideIcon("Link2", LUCIDE_ICON_NODES["Link2"]);
export const List = createSolidLucideIcon(
  "List",
  LUCIDE_ICON_NODES["List"] || [
    ["path", { d: "M3 12h.01", key: "nlz23k" }],
    ["path", { d: "M3 18h.01", key: "1tta3j" }],
    ["path", { d: "M3 6h.01", key: "1rqtza" }],
    ["path", { d: "M8 12h13", key: "1za7za" }],
    ["path", { d: "M8 18h13", key: "1lx6n3" }],
    ["path", { d: "M8 6h13", key: "ik3vkj" }],
  ]
);
export const ListCollapse = createSolidLucideIcon(
  "ListCollapse",
  LUCIDE_ICON_NODES["ListCollapse"] || [
    ["path", { d: "m3 10 2.5-2.5L3 5" }],
    ["path", { d: "m3 19 2.5-2.5L3 14" }],
    ["path", { d: "M10 6h11" }],
    ["path", { d: "M10 12h11" }],
    ["path", { d: "M10 18h11" }],
  ]
);
export const ListFilter = createSolidLucideIcon("ListFilter", LUCIDE_ICON_NODES["ListFilter"]);
export const ListOrdered = createSolidLucideIcon(
  "ListOrdered",
  LUCIDE_ICON_NODES["ListOrdered"] || [
    ["path", { d: "M10 12h11", key: "6m4ad9" }],
    ["path", { d: "M10 18h11", key: "11hvi2" }],
    ["path", { d: "M10 6h11", key: "c7qv1k" }],
    ["path", { d: "M4 10h2", key: "16xx2s" }],
    ["path", { d: "M4 6h1v4", key: "cnovpq" }],
    ["path", { d: "M6 18H4c0-1 2-2 2-3s-1-1.5-2-1", key: "m9a95d" }],
  ]
);
export const ListTodo = createSolidLucideIcon(
  "ListTodo",
  LUCIDE_ICON_NODES["ListTodo"] || [
    ["rect", { x: "3", y: "5", width: "6", height: "6", rx: "1", key: "1defrl" }],
    ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
    ["path", { d: "M13 6h8", key: "15sg57" }],
    ["path", { d: "M13 12h8", key: "h98zly" }],
    ["path", { d: "M13 18h8", key: "oe0vm4" }],
  ]
);
export const ListTree = createSolidLucideIcon("ListTree", LUCIDE_ICON_NODES["ListTree"]);
export const Loader2 = createSolidLucideIcon("Loader2", LUCIDE_ICON_NODES["Loader2"]);
export const Lock = createSolidLucideIcon("Lock", LUCIDE_ICON_NODES["Lock"]);
export const MapPin = createSolidLucideIcon("MapPin", LUCIDE_ICON_NODES["MapPin"]);
export const Maximize = createSolidLucideIcon("Maximize", LUCIDE_ICON_NODES["Maximize"]);
export const Maximize2 = createSolidLucideIcon("Maximize2", LUCIDE_ICON_NODES["Maximize2"]);
export const MessageSquare = createSolidLucideIcon("MessageSquare", LUCIDE_ICON_NODES["MessageSquare"]);
export const MessageSquarePlus = createSolidLucideIcon("MessageSquarePlus", LUCIDE_ICON_NODES["MessageSquarePlus"]);
export const MessageSquareText = createSolidLucideIcon("MessageSquareText", LUCIDE_ICON_NODES["MessageSquareText"]);
export const Mic = createSolidLucideIcon("Mic", LUCIDE_ICON_NODES["Mic"]);
export const Minimize2 = createSolidLucideIcon("Minimize2", LUCIDE_ICON_NODES["Minimize2"]);
export const Minus = createSolidLucideIcon(
  "Minus",
  LUCIDE_ICON_NODES["Minus"] || [["path", { d: "M5 12h14", key: "minus" }]]
);
export const Monitor = createSolidLucideIcon("Monitor", LUCIDE_ICON_NODES["Monitor"]);
export const MonitorSmartphone = createSolidLucideIcon("MonitorSmartphone", LUCIDE_ICON_NODES["MonitorSmartphone"]);
export const Moon = createSolidLucideIcon("Moon", LUCIDE_ICON_NODES["Moon"]);
export const MoreHorizontal = createSolidLucideIcon("MoreHorizontal", LUCIDE_ICON_NODES["MoreHorizontal"]);
export const MoreVertical = createSolidLucideIcon("MoreVertical", LUCIDE_ICON_NODES["MoreVertical"]);
export const MoveUpRight = createSolidLucideIcon("MoveUpRight", LUCIDE_ICON_NODES["MoveUpRight"]);
export const Package = createSolidLucideIcon("Package", LUCIDE_ICON_NODES["Package"]);
export const PackageCheck = createSolidLucideIcon("PackageCheck", LUCIDE_ICON_NODES["PackageCheck"]);
export const Palette = createSolidLucideIcon("Palette", LUCIDE_ICON_NODES["Palette"]);
export const PanelBottom = createSolidLucideIcon("PanelBottom", LUCIDE_ICON_NODES["PanelBottom"]);
export const PanelBottomClose = createSolidLucideIcon("PanelBottomClose", LUCIDE_ICON_NODES["PanelBottomClose"]);
export const PanelLeft = createSolidLucideIcon("PanelLeft", LUCIDE_ICON_NODES["PanelLeft"]);
export const PanelRight = createSolidLucideIcon("PanelRight", LUCIDE_ICON_NODES["PanelRight"]);
export const PanelRightClose = createSolidLucideIcon("PanelRightClose", LUCIDE_ICON_NODES["PanelRightClose"]);
export const Paperclip = createSolidLucideIcon("Paperclip", LUCIDE_ICON_NODES["Paperclip"]);
export const Pause = createSolidLucideIcon("Pause", LUCIDE_ICON_NODES["Pause"]);
export const Pencil = createSolidLucideIcon(
  "Pencil",
  LUCIDE_ICON_NODES["Pencil"] || [
    ["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }],
    ["path", { d: "m15 5 4 4" }],
  ]
);
export const Edit3 = Pencil;
export const Percent = createSolidLucideIcon("Percent", LUCIDE_ICON_NODES["Percent"]);
export const PictureInPicture2 = createSolidLucideIcon("PictureInPicture2", LUCIDE_ICON_NODES["PictureInPicture2"]);
export const PiggyBank = createSolidLucideIcon("PiggyBank", LUCIDE_ICON_NODES["PiggyBank"]);
export const Pilcrow = createSolidLucideIcon(
  "Pilcrow",
  LUCIDE_ICON_NODES["Pilcrow"] || [
    ["path", { d: "M13 4v16", key: "8vvj80" }],
    ["path", { d: "M17 4v16", key: "7dpous" }],
    ["path", { d: "M19 4H9.5a4.5 4.5 0 0 0 0 9H13", key: "sh4n9v" }],
  ]
);
export const Pin = createSolidLucideIcon("Pin", LUCIDE_ICON_NODES["Pin"]);
export const Play = createSolidLucideIcon("Play", LUCIDE_ICON_NODES["Play"]);
export const Plus = createSolidLucideIcon("Plus", LUCIDE_ICON_NODES["Plus"]);
export const Power = createSolidLucideIcon("Power", LUCIDE_ICON_NODES["Power"]);
export const Printer = createSolidLucideIcon("Printer", LUCIDE_ICON_NODES["Printer"]);
export const Puzzle = createSolidLucideIcon("Puzzle", LUCIDE_ICON_NODES["Puzzle"]);
export const QrCode = createSolidLucideIcon("QrCode", LUCIDE_ICON_NODES["QrCode"]);
export const Quote = createSolidLucideIcon(
  "Quote",
  LUCIDE_ICON_NODES["Quote"] || [
    ["path", { d: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z", key: "rib7q0" }],
    ["path", { d: "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z", key: "1ymkrd" }],
  ]
);
export const Radio = createSolidLucideIcon("Radio", LUCIDE_ICON_NODES["Radio"]);
export const RefreshCw = createSolidLucideIcon("RefreshCw", LUCIDE_ICON_NODES["RefreshCw"]);
export const RotateCcw = createSolidLucideIcon("RotateCcw", LUCIDE_ICON_NODES["RotateCcw"]);
export const RotateCw = createSolidLucideIcon("RotateCw", LUCIDE_ICON_NODES["RotateCw"]);
export const Rows2 = createSolidLucideIcon("Rows2", LUCIDE_ICON_NODES["Rows2"]);
export const Save = createSolidLucideIcon("Save", LUCIDE_ICON_NODES["Save"]);
export const Search = createSolidLucideIcon("Search", LUCIDE_ICON_NODES["Search"]);
export const Send = createSolidLucideIcon("Send", LUCIDE_ICON_NODES["Send"]);
export const Server = createSolidLucideIcon("Server", LUCIDE_ICON_NODES["Server"]);
export const Settings = createSolidLucideIcon("Settings", LUCIDE_ICON_NODES["Settings"]);
export const Share2 = createSolidLucideIcon("Share2", LUCIDE_ICON_NODES["Share2"]);
export const Shield = createSolidLucideIcon("Shield", LUCIDE_ICON_NODES["Shield"]);
export const ShieldAlert = createSolidLucideIcon("ShieldAlert", LUCIDE_ICON_NODES["ShieldAlert"]);
export const ShieldCheck = createSolidLucideIcon("ShieldCheck", LUCIDE_ICON_NODES["ShieldCheck"]);
export const ShoppingBag = createSolidLucideIcon("ShoppingBag", LUCIDE_ICON_NODES["ShoppingBag"]);
export const Shuffle = createSolidLucideIcon("Shuffle", LUCIDE_ICON_NODES["Shuffle"]);
export const SkipBack = createSolidLucideIcon("SkipBack", LUCIDE_ICON_NODES["SkipBack"]);
export const SkipForward = createSolidLucideIcon("SkipForward", LUCIDE_ICON_NODES["SkipForward"]);
export const Slash = createSolidLucideIcon("Slash", LUCIDE_ICON_NODES["Slash"]);
export const Sliders = createSolidLucideIcon("Sliders", LUCIDE_ICON_NODES["Sliders"]);
export const SlidersHorizontal = createSolidLucideIcon("SlidersHorizontal", LUCIDE_ICON_NODES["SlidersHorizontal"]);
export const Smartphone = createSolidLucideIcon("Smartphone", LUCIDE_ICON_NODES["Smartphone"]);
export const Sparkles = createSolidLucideIcon("Sparkles", LUCIDE_ICON_NODES["Sparkles"]);
export const Square = createSolidLucideIcon("Square", LUCIDE_ICON_NODES["Square"]);
export const Tag = createSolidLucideIcon(
  "Tag",
  LUCIDE_ICON_NODES["Tag"] || [
    ["path", { d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z", key: "vktsd0" }],
    ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor", key: "kqv944" }],
  ]
);
export const SquareTerminal = createSolidLucideIcon(
  "SquareTerminal",
  LUCIDE_ICON_NODES["SquareTerminal"] || [
    ["path", { d: "m7 11 2-2-2-2" }],
    ["path", { d: "M11 13h4" }],
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ]
);
export const Strikethrough = createSolidLucideIcon(
  "Strikethrough",
  LUCIDE_ICON_NODES["Strikethrough"] || [
    ["path", { d: "M16 4H9a3 3 0 0 0-2.83 4", key: "43sutm" }],
    ["path", { d: "M14 12a4 4 0 0 1 0 8H6", key: "nlfj13" }],
    ["line", { x1: "4", x2: "20", y1: "12", y2: "12", key: "1e0a9i" }],
  ]
);
export const Sun = createSolidLucideIcon("Sun", LUCIDE_ICON_NODES["Sun"]);
export const Table = createSolidLucideIcon(
  "Table",
  LUCIDE_ICON_NODES["Table"] || [
    ["path", { d: "M12 3v18", key: "108xh3" }],
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
    ["path", { d: "M3 9h18", key: "1pudct" }],
    ["path", { d: "M3 15h18", key: "5xshup" }],
  ]
);
export const Tablet = createSolidLucideIcon("Tablet", LUCIDE_ICON_NODES["Tablet"]);
export const Terminal = createSolidLucideIcon("Terminal", LUCIDE_ICON_NODES["Terminal"]);
export const TerminalIcon = createSolidLucideIcon("TerminalIcon", LUCIDE_ICON_NODES["TerminalIcon"]);
export const TerminalSquare = createSolidLucideIcon("TerminalSquare", LUCIDE_ICON_NODES["TerminalSquare"]);
export const Trash2 = createSolidLucideIcon("Trash2", LUCIDE_ICON_NODES["Trash2"]);
export const TrendingDown = createSolidLucideIcon("TrendingDown", LUCIDE_ICON_NODES["TrendingDown"]);
export const TrendingUp = createSolidLucideIcon("TrendingUp", LUCIDE_ICON_NODES["TrendingUp"]);
export const Trophy = createSolidLucideIcon("Trophy", LUCIDE_ICON_NODES["Trophy"]);
export const Tv = createSolidLucideIcon("Tv", LUCIDE_ICON_NODES["Tv"]);
export const Type = createSolidLucideIcon("Type", LUCIDE_ICON_NODES["Type"]);
export const Undo2 = createSolidLucideIcon("Undo2", LUCIDE_ICON_NODES["Undo2"]);
export const Unlock = createSolidLucideIcon(
  "Unlock",
  LUCIDE_ICON_NODES["Unlock"] || [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1" }],
  ]
);
export const User = createSolidLucideIcon("User", LUCIDE_ICON_NODES["User"]);
export const UserCheck = createSolidLucideIcon("UserCheck", LUCIDE_ICON_NODES["UserCheck"]);
export const Users = createSolidLucideIcon("Users", LUCIDE_ICON_NODES["Users"]);
export const Vibrate = createSolidLucideIcon(
  "Vibrate",
  LUCIDE_ICON_NODES["Vibrate"] || [
    ["path", { d: "m2 8 2 2-2 2 2 2-2 2", key: "sv1b1" }],
    ["path", { d: "m22 8-2 2 2 2-2 2 2 2", key: "101i4y" }],
    ["rect", { width: "8", height: "14", x: "8", y: "5", rx: "1", key: "1oyrl4" }],
  ]
);
export const Volume2 = createSolidLucideIcon("Volume2", LUCIDE_ICON_NODES["Volume2"]);
export const VolumeX = createSolidLucideIcon("VolumeX", LUCIDE_ICON_NODES["VolumeX"]);
export const Wifi = createSolidLucideIcon("Wifi", LUCIDE_ICON_NODES["Wifi"]);
export const WrapText = createSolidLucideIcon("WrapText", LUCIDE_ICON_NODES["WrapText"]);
export const Wrench = createSolidLucideIcon("Wrench", LUCIDE_ICON_NODES["Wrench"]);
export const X = createSolidLucideIcon("X", LUCIDE_ICON_NODES["X"]);
export const XCircle = createSolidLucideIcon("XCircle", LUCIDE_ICON_NODES["XCircle"]);
export const Zap = createSolidLucideIcon("Zap", LUCIDE_ICON_NODES["Zap"]);
export const ZoomIn = createSolidLucideIcon("ZoomIn", LUCIDE_ICON_NODES["ZoomIn"]);
export const ZoomOut = createSolidLucideIcon("ZoomOut", LUCIDE_ICON_NODES["ZoomOut"]);
export const PlayCircle = createSolidLucideIcon(
  "PlayCircle",
  LUCIDE_ICON_NODES["PlayCircle"] || [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["polygon", { points: "10 8 16 12 10 16 10 8" }],
  ]
);
export const PanelRightOpen = createSolidLucideIcon(
  "PanelRightOpen",
  LUCIDE_ICON_NODES["PanelRightOpen"] || [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M15 3v18" }],
    ["path", { d: "m10 15-3-3 3-3" }],
  ]
);
export const Video = createSolidLucideIcon(
  "Video",
  LUCIDE_ICON_NODES["Video"] || [
    ["path", { d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" }],
    ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2" }],
  ]
);
export const FileCheck2 = createSolidLucideIcon(
  "FileCheck2",
  LUCIDE_ICON_NODES["FileCheck2"] || [
    ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { d: "m3 15 2 2 4-4" }],
  ]
);
export const Timer = createSolidLucideIcon(
  "Timer",
  LUCIDE_ICON_NODES["Timer"] || [
    ["line", { x1: "10", x2: "14", y1: "2", y2: "2" }],
    ["line", { x1: "12", x2: "15", y1: "14", y2: "11" }],
    ["circle", { cx: "12", cy: "14", r: "8" }],
  ]
);
export const Upload = createSolidLucideIcon(
  "Upload",
  LUCIDE_ICON_NODES["Upload"] || [
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["polyline", { points: "17 8 12 3 7 8" }],
    ["line", { x1: "12", x2: "12", y1: "3", y2: "15" }],
  ]
);
export const FileJson = createSolidLucideIcon(
  "FileJson",
  LUCIDE_ICON_NODES["FileJson"] || [
    ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { d: "M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" }],
    ["path", { d: "M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" }],
  ]
);
export const GitMerge = createSolidLucideIcon(
  "GitMerge",
  LUCIDE_ICON_NODES["GitMerge"] || [
    ["circle", { cx: "18", cy: "18", r: "3" }],
    ["circle", { cx: "6", cy: "6", r: "3" }],
    ["path", { d: "M6 21V9a9 9 0 0 0 9 9" }],
  ]
);
export const ListChecks = createSolidLucideIcon(
  "ListChecks",
  LUCIDE_ICON_NODES["ListChecks"] || [
    ["path", { d: "m3 17 2 2 4-4" }],
    ["path", { d: "m3 7 2 2 4-4" }],
    ["path", { d: "M13 6h8" }],
    ["path", { d: "M13 12h8" }],
    ["path", { d: "M13 18h8" }],
  ]
);

export default LUCIDE_ICON_NODES;
export const KeyRound = createSolidLucideIcon("KeyRound", LUCIDE_ICON_NODES["KeyRound"]);
export const ScrollText = createSolidLucideIcon("ScrollText", LUCIDE_ICON_NODES["ScrollText"]);
