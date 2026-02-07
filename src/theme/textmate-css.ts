import * as dom from "../lib/dom";
dom.importCss({
".ace-tm .ace_gutter": {
	backgroundColor: "#f0f0f0",
	textColor: "#333",
},

".ace-tm .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-tm .ace_fold": {
	backgroundColor: "#6B72E6",
},

".ace-tm": {
	backgroundColor: "#FFFFFF",
	textColor:"#000",
},

".ace-tm .ace_cursor": {
	textColor:"#000",
},
	    
".ace-tm .ace_invisible": {
	textColor:"rgb(191, 191, 191)",
},

".ace-tm .ace_storage,.ace-tm .ace_keyword": {
	textColor:"#00f",
},

".ace-tm .ace_constant": {
	textColor:"rgb(197, 6, 11)",
},

".ace-tm .ace_constant.ace_buildin": {
	textColor:"rgb(88, 72, 246)",
},

".ace-tm .ace_constant.ace_language": {
	textColor:"rgb(88, 92, 246)",
},

".ace-tm .ace_constant.ace_library": {
	textColor:"rgb(6, 150, 14)",
},

".ace-tm .ace_invalid": {
	backgroundColor: "rgba(255, 0, 0, 0.1)",
	textColor:"#f00",
},

".ace-tm .ace_support.ace_function": {
	textColor:"rgb(60, 76, 114)",
},

".ace-tm .ace_support.ace_constant": {
	textColor:"rgb(6, 150, 14)",
},

".ace-tm .ace_support.ace_type,.ace-tm .ace_support.ace_class": {
	textColor:"rgb(109, 121, 222)",
},

".ace-tm .ace_keyword.ace_operator": {
	textColor:"rgb(104, 118, 135)",
},

".ace-tm .ace_string": {
	textColor:"rgb(3, 106, 7)",
},

".ace-tm .ace_comment": {
	textColor:"rgb(76, 136, 107)",
},

".ace-tm .ace_comment.ace_doc": {
	textColor:"rgb(0, 102, 255)",
},

".ace-tm .ace_comment.ace_doc.ace_tag": {
	textColor:"rgb(128, 159, 191)",
},

".ace-tm .ace_constant.ace_numeric": {
	textColor:"rgb(0, 0, 205)",
},

".ace-tm .ace_variable": {
	textColor:"rgb(49, 132, 149)",
},

".ace-tm .ace_xml-pe": {
	textColor:"rgb(104, 104, 91)",
},

".ace-tm .ace_entity.ace_name.ace_function": {
	textColor: "#0000A2",
},


".ace-tm .ace_heading": {
	textColor:"rgb(12, 7, 255)",
},

".ace-tm .ace_list": {
	textColor:"rgb(185, 6, 144)",
},

".ace-tm .ace_meta.ace_tag": {
	textColor:"rgb(0, 22, 142)",
},

".ace-tm .ace_string.ace_regex": {
	textColor:"rgb(255, 0, 0)",
},

".ace-tm .ace_marker-layer .ace_selection": {
	backgroundColor: "rgb(181, 213, 255)",
},
".ace-tm.ace_multiselect .ace_selection.ace_start": {
	// boxShadow: "0 0 3 #fff",
},
".ace-tm .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(252, 255, 0)",
},

".ace-tm .ace_marker-layer .ace_stack": {
	backgroundColor: "rgb(164, 229, 101)",
},

".ace-tm .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgb(192, 192, 192)",
},

".ace-tm .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(0, 0, 0, 0.07)",
},

".ace-tm .ace_gutter-active-line": {
	backgroundColor : "#dcdcdc",
},

".ace-tm .ace_marker-layer .ace_selected-word": {
	backgroundColor: "rgb(250, 250, 255)",
	border: "1 rgb(200, 200, 250)",
},

".ace-tm .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==', 1 auto, x=end, repeatY)",
},

".ace-tm .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
}, "textmate.css", true);
