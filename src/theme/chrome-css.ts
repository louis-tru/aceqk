import * as dom from "../lib/dom";
dom.importCss({
".ace-chrome .ace_gutter": {
	backgroundColor: "#ebebeb",
	textColor: "#333",
	// overflow : "hidden",
},

".ace-chrome .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-chrome": {
	backgroundColor: "#FFFFFF",
	textColor:"#000",
},

".ace-chrome .ace_cursor": {
	textColor:"#000",
},

".ace-chrome .ace_invisible": {
	textColor:"rgb(191, 191, 191)",
},

".ace-chrome .ace_constant.ace_buildin": {
	textColor:"rgb(88, 72, 246)",
},

".ace-chrome .ace_constant.ace_language": {
	textColor:"rgb(88, 92, 246)",
},

".ace-chrome .ace_constant.ace_library": {
	textColor:"rgb(6, 150, 14)",
},

".ace-chrome .ace_invalid": {
	backgroundColor: "rgb(153, 0, 0)",
	textColor:"#fff",
},

".ace-chrome .ace_fold": {
},

".ace-chrome .ace_support.ace_function": {
	textColor:"rgb(60, 76, 114)",
},

".ace-chrome .ace_support.ace_constant": {
	textColor:"rgb(6, 150, 14)",
},

".ace-chrome .ace_support.ace_type, .ace-chrome .ace_support.ace_class, .ace-chrome .ace_support.ace_other": {
	textColor:"rgb(109, 121, 222)",
},

".ace-chrome .ace_variable.ace_parameter": {
	fontSlant: "italic",
	textColor: "#FD971F",
},
".ace-chrome .ace_keyword.ace_operator": {
	textColor:"rgb(104, 118, 135)",
},

".ace-chrome .ace_comment": {
	textColor: "#236e24",
},

".ace-chrome .ace_comment.ace_doc": {
	textColor: "#236e24",
},

".ace-chrome .ace_comment.ace_doc.ace_tag": {
	textColor: "#236e24",
},

".ace-chrome .ace_constant.ace_numeric": {
	textColor:"rgb(0, 0, 205)",
},

".ace-chrome .ace_variable": {
	textColor:"rgb(49, 132, 149)",
},

".ace-chrome .ace_xml-pe": {
	textColor:"rgb(104, 104, 91)",
},

".ace-chrome .ace_entity.ace_name.ace_function": {
	textColor: "#0000A2",
},


".ace-chrome .ace_heading": {
	textColor:"rgb(12, 7, 255)",
},

".ace-chrome .ace_list": {
	textColor:"rgb(185, 6, 144)",
},

".ace-chrome .ace_marker-layer .ace_selection": {
	backgroundColor: "rgb(181, 213, 255)",
},

".ace-chrome .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(252, 255, 0)",
},

".ace-chrome .ace_marker-layer .ace_stack": {
	backgroundColor: "rgb(164, 229, 101)",
},

".ace-chrome .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgb(192, 192, 192)",
},

".ace-chrome .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(0, 0, 0, 0.07)",
},

".ace-chrome .ace_gutter-active-line": {
	backgroundColor : "#dcdcdc",
},

".ace-chrome .ace_marker-layer .ace_selected-word": {
	backgroundColor: "rgb(250, 250, 255)",
	border: "1 rgb(200, 200, 250)",
},

".ace-chrome .ace_storage,.ace-chrome .ace_keyword,.ace-chrome .ace_meta.ace_tag": {
	textColor:"rgb(147, 15, 128)",
},

".ace-chrome .ace_string.ace_regex": {
	textColor:"rgb(255, 0, 0)",
},

".ace-chrome .ace_string": {
	textColor: "#1A1AA6",
},

".ace-chrome .ace_entity.ace_other.ace_attribute-name": {
	textColor: "#994409",
},

".ace-chrome .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==', 1 auto, x=end, repeatY)",
},

".ace-chrome .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
