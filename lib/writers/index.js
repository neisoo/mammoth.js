var htmlWriter = require("./html-writer");
var markdownWriter = require("./markdown-writer");
var markdownItWriter = require("./markdown-it-writer");

exports.writer = writer;


function writer(options) {
    options = options || {};
    if (options.outputFormat === "markdown-it") {
        return markdownItWriter.writer();
    } else if (options.outputFormat === "markdown") {
        return markdownWriter.writer();
    } else {
        return htmlWriter.writer(options);
    }
}
