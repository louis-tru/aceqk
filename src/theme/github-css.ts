import * as dom from "../lib/dom";
dom.importCss({
/* CSS style content from github's default pygments highlighter template.
	 Cursor and selection styles from textmate.css. */
".ace-github .ace_gutter": {
	backgroundColor: "#e8e8e8",
	textColor: "#AAA",
},

".ace-github": {
	backgroundColor: "#fff",
	textColor: "#000",
},

".ace-github .ace_keyword": {
	fontWeight: "bold",
},

".ace-github .ace_string": {
	textColor: "#D14",
},

".ace-github .ace_variable.ace_class": {
	textColor:"#008080",
},

".ace-github .ace_constant.ace_numeric": {
	textColor: "#099",
},

".ace-github .ace_constant.ace_buildin": {
	textColor: "#0086B3",
},

".ace-github .ace_support.ace_function": {
	textColor: "#0086B3",
},

".ace-github .ace_comment": {
	textColor: "#998",
	fontSlant: "italic",
},

".ace-github .ace_variable.ace_language": {
	textColor: "#0086B3",
},

".ace-github .ace_paren": {
	fontWeight: "bold",
},

".ace-github .ace_boolean": {
	fontWeight: "bold",
},

".ace-github .ace_string.ace_regexp": {
	textColor: "#009926",
	fontWeight: "normal",
},

".ace-github .ace_variable.ace_instance": {
	textColor:"#008080",
},

".ace-github .ace_constant.ace_language": {
	fontWeight: "bold",
},

".ace-github .ace_cursor": {
	textColor:"#000",
},

".ace-github.ace_focus .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgb(255, 255, 204)",
},
".ace-github .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgb(245, 245, 245)",
},

".ace-github .ace_marker-layer .ace_selection": {
	backgroundColor: "rgb(181, 213, 255)",
},

".ace-github.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #fff",
},
/* bold keywords cause cursor issues for some fonts */
/* this disables bold style for editor and keeps for static highlighter */
".ace-github.ace_nobold .ace_line > span": {
	fontWeight: "normal",// !important",
},

".ace-github .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(252, 255, 0)",
},

".ace-github .ace_marker-layer .ace_stack": {
	backgroundColor: "rgb(164, 229, 101)",
},

".ace-github .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgb(192, 192, 192)",
},

".ace-github .ace_gutter-active-line": {
	backgroundColor : "rgba(0, 0, 0, 0.07)",
},

".ace-github .ace_marker-layer .ace_selected-word": {
	backgroundColor: "rgb(250, 250, 255)",
	border: "1 rgb(200, 200, 250)",
},

".ace-github .ace_invisible": {
	textColor:"#BFBFBF",
},

".ace-github .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-github .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==', 1 auto, x=end, repeatY)",
},

".ace-github .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAZSURBVHjaYvj///9/hivKyv8BAAAA//8DACLqBhbvk+/eAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
