var _ = require("underscore");
const MathMl2LaTeX = require('mathml2latex').default;

function symmetricMarkdownElement(end) {
    return markdownElement(end, end);
}

function markdownParagraph() {
    return function(attributes, list, listItem, table) {
        return {
            start: table.inCell ? " " : "\n\n",
            end: table.inCell ? " " : "\n\n"
        };
    };
}

function markdownElement(start, end) {
    return function() {
        return {start: start, end: end};
    };
}

function markdownLink(attributes) {
    var href = attributes.href || "";
    if (href) {
        return {
            start: "[",
            end: "](" + href + ")",
            anchorPosition: "before"
        };
    } else {
        return {};
    }
}

function markdownImage(attributes) {
    var src = attributes.src || "";
    var altText = attributes.alt || "";
    if (src || altText) {
        return {start: "![" + altText + "](" + src + ")"};
    } else {
        return {};
    }
}

function markdownList(options) {
    return function(attributes, list) {
        return {
            start: list ? "\n" : "",
            end: list ? "" : "\n",
            list: {
                isOrdered: options.isOrdered,
                indent: list ? list.indent + 1 : 0,
                count: 0
            }
        };
    };
}

function markdownListItem(attributes, list, listItem) {
    list = list || {indent: 0, isOrdered: false, count: 0};
    list.count++;
    listItem.hasClosed = false;

    var bullet = list.isOrdered ? list.count + "." : "-";
    var start = repeatString("\t", list.indent) + bullet + " ";

    return {
        start: start,
        end: function() {
            if (!listItem.hasClosed) {
                listItem.hasClosed = true;
                return "\n";
            }
        }
    };
}

function markdownTable() {
    return function(attributes, list, listItem, table, fragments) {
        table.maxColCount = 0;
        table.colCount = 0;
        table.inCell = false;
        table.startIdx = fragments.length; // 记录下table标签开始输出的位置
        return {
            start: "", // 开始时输出的内容，可以是字符串或返回字符串的函数
            end: function() {
                // 在记录下table标签开始输出的位置输出包含实际列数的表头，表格单元格居中对齐
                fragments[table.startIdx] = "\n|" + new Array(table.maxColCount + 1).join(":-:|");
                return "\n";
            } // 结束时输出的内容，可以是字符串或返回字符串的函数
        };
    };
}

function markdownTableRow() {
    return function(attributes, list, listItem, table) {
        table.maxColCount = table.maxColCount < table.colCount ? table.colCount : table.maxColCount;
        table.start =
        table.colCount = 0;
        return {
            start: table ? "\n|" : "",
            end: ""
        };
    };
}

function markdownTableCol() {
    return function(attributes, list, listItem, table) {
        table.inCell = true;
        table.colCount++;
        return {
            start: "",
            end: table ? function() {
                table.inCell = false;
                return "|";
            } : ""
        };
    };
}

var htmlToMarkdown = {
    "p": markdownParagraph(),
    "br": markdownElement("", "  \n"),
    "ul": markdownList({isOrdered: false}),
    "ol": markdownList({isOrdered: true}),
    "li": markdownListItem,
    "strong": symmetricMarkdownElement("**"), // 粗体
    "em": symmetricMarkdownElement("*"), // 斜体
    "ins": markdownElement("[", "]{.ul}"), // 下划线
    "a": markdownLink,
    "img": markdownImage,
    "table": markdownTable(),
    "tr": markdownTableRow(),
    "td": markdownTableCol()
};

(function() {
    for (var i = 1; i <= 6; i++) {
        htmlToMarkdown["h" + i] = markdownElement(repeatString("#", i) + " ", "\n\n");
    }
})();

function repeatString(value, count) {
    return new Array(count + 1).join(value);
}

function markdownWriter() {
    var fragments = []; // 记录输出的内容
    var elementStack = []; // 元素栈
    var list = null;
    var listItem = {};
    var table = {};

    // tag标签开始时调用
    function open(tagName, attributes) {
        attributes = attributes || {};

        // 获取htmlToMarkdown中tagName的对应处理函数
        var createElement = htmlToMarkdown[tagName] || function() {
            return {};
        };

        // 获取元素开始时的输出start和结束时的输出end。
        // end入栈,等待结束时出栈并调用。
        var element = createElement(attributes, list, listItem, table, fragments);
        elementStack.push({end: element.end, list: list});

        // 更新list状态
        if (element.list) {
            list = element.list;
        }

        // 锚点在前面输出
        var anchorBeforeStart = element.anchorPosition === "before";
        if (anchorBeforeStart) {
            writeAnchor(attributes);
        }

        // tag标签开始时输出的内容
        fragments.push(element.start || "");

        // 锚点在后面输出
        if (!anchorBeforeStart) {
            writeAnchor(attributes);
        }
    }

    // 锚点
    function writeAnchor(attributes) {
        if (attributes.id) {
            fragments.push('<a id="' + attributes.id + '"></a>');
        }
    }

    // tag标签结束时调用
    function close(tagName) {
        // 元素出栈
        var element = elementStack.pop();
        list = element.list;

        // tag结束时输出的内容
        var end = _.isFunction(element.end) ? element.end() : element.end;
        fragments.push(end || "");
    }

    // 处理自关闭tag标签
    function selfClosing(tagName, attributes) {
        open(tagName, attributes);
        close(tagName);
    }

    // 文本
    function text(value) {
        fragments.push(escapeMarkdown(value));
    }

    // 公式
    function mathml(value) {
        // 将mathml转成latex格式
        var latex = MathMl2LaTeX.convert(value)
        if (value.indexOf('<math display="inline">') >= 0) {
            // 行内
            fragments.push('$' + latex + '$');
        } else {
            // 单独占用一个新的段落
            fragments.push('\n$$' + latex + '$$\n');
        }

    }

    // 输出完整的字符串
    function asString() {
        return fragments.join("");
    }

    return {
        asString: asString,
        open: open,
        close: close,
        text: text,
        mathml: mathml,
        selfClosing: selfClosing
    };
}

exports.writer = markdownWriter;

function escapeMarkdown(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/([\`\*_\{\}\[\]\(\)\#\+\-\.\!])/g, '\\$1');
}
