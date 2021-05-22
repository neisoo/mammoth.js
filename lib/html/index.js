var ast = require("./ast");

exports.freshElement = ast.freshElement;
exports.nonFreshElement = ast.nonFreshElement;
exports.elementWithTag = ast.elementWithTag;
exports.text = ast.text;
exports.forceWrite = ast.forceWrite;
exports.mathml = ast.mathml;

exports.simplify = require("./simplify");

// 遍历节点，将节点通过writer输出，writer可以是html-writer或markdown-writer
// 通过writer将节点呈现成对应的html/markdown内容。
function write(writer, nodes) {
    nodes.forEach(function(node) {
        writeNode(writer, node);
    });
}

function writeNode(writer, node) {
    toStrings[node.type](writer, node);
}

var toStrings = {
    element: generateElementString, // 元素节点
    text: generateTextString, // 文字节点
    mathml: generateMathMLString, // mathml公式节点
    forceWrite: function() { }
};

function generateElementString(writer, node) {
    if (ast.isVoidElement(node)) {
        writer.selfClosing(node.tag.tagName, node.tag.attributes);
    } else {
        writer.open(node.tag.tagName, node.tag.attributes);
        write(writer, node.children);
        writer.close(node.tag.tagName);
    }
}

function generateTextString(writer, node) {
    writer.text(node.value);
}

function generateMathMLString(writer, node) {
    writer.mathml(node.value); // 调用writer输出mathml公式
}

exports.write = write;
