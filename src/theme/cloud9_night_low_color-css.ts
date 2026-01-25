import * as dom from "../lib/dom";
dom.importCss({
".ace-cloud9-night-low-color .ace_gutter": {
	backgroundColor: "#303130",
	textColor:"#eee",
},

".ace-cloud9-night-low-color .ace_print-margin": {
	width: 1,
	backgroundColor: "#222",
},

".ace-cloud9-night-low-color": {
	backgroundColor: "#181818",
	textColor:"#EBEBEB",
},

".ace-cloud9-night-low-color .ace_cursor": {
	textColor:"#9F9F9F",
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_selection": {
	backgroundColor: "#424242",
},

".ace-cloud9-night-low-color.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #000000",
	borderRadius: 2,
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #888888",
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_highlight": {
	border: "1 rgb(110, 119, 0)",
	borderBottomWidth: 0,
	// boxShadow: "inset 0 -1 rgb(110, 119, 0)",
	margin: [-1, 0, 0, -1],
	backgroundColor: "rgba(255, 235, 0, 0.1)",
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_active-line": {
	backgroundColor: "#292929",
},

".ace-cloud9-night-low-color .ace_gutter-active-line": {
	backgroundColor: "#3D3D3D",
},

".ace-cloud9-night-low-color .ace_stack": {
	backgroundColor: "rgb(66, 90, 44)",
},

".ace-cloud9-night-low-color .ace_marker-layer .ace_selected-word": {
	border: "1 #888888",
},

".ace-cloud9-night-low-color .ace_invisible": {
	textColor:"#343434",
},

".ace-cloud9-night-low-color .ace_keyword,.ace-cloud9-night-low-color .ace_meta,.ace-cloud9-night-low-color .ace_storage": {
	textColor:"#C397D8",
},

".ace-cloud9-night-low-color .ace_keyword.ace_operator": {
	textColor:"#70C0B1",
},

".ace-cloud9-night-low-color .ace_constant.ace_character,\
.ace-cloud9-night-low-color .ace_constant.ace_language,\
.ace-cloud9-night-low-color .ace_constant.ace_numeric,\
.ace-cloud9-night-low-color .ace_keyword.ace_other.ace_unit": {
	textColor:"#DAA637",
},

".ace-cloud9-night-low-color .ace_constant.ace_other": {
	textColor:"#EEEEEE",
},

".ace-cloud9-night-low-color .ace_invalid": {
	textColor: "#CED2CF",
	backgroundColor: "#DF5F5F",
},

".ace-cloud9-night-low-color .ace_invalid.ace_deprecated": {
	textColor: "#CED2CF",
	backgroundColor: "#B798BF",
},

".ace-cloud9-night-low-color .ace_fold": {
	backgroundColor: "#7AA6DA",
	borderColor: "#DEDEDE",
},

[`.ace-cloud9-night-low-color .ace_entity.ace_name.ace_function,
	.ace-cloud9-night-low-color .ace_support.ace_function,
	.ace-cloud9-night-low-color .ace_variable:not(.ace_parameter),
	.ace-cloud9-night-low-color .ace_constant:not(.ace_numeric)`]: {
	textColor:"#7AA6DA",
},

".ace-cloud9-night-low-color .ace_support.ace_class,.ace-cloud9-night-low-color .ace_support.ace_type": {
	textColor:"#E7C547",
},

".ace-cloud9-night-low-color .ace_heading,.ace-cloud9-night-low-color .ace_markup.ace_heading,.ace-cloud9-night-low-color .ace_string": {
	textColor:"#B9CA4A",
},

".ace-cloud9-night-low-color .ace_comment": {
	textColor:"#969896",
},

".ace-cloud9-night-low-color .ace_c9searchresults.ace_keyword": {
	textColor: "#C2C280",
},

".ace-cloud9-night-low-color .ace_indent-guide": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYFBXV/8PAAJoAXX4kT2EAAAAAElFTkSuQmCC) right repeat-y
},

".ace-cloud9-night-low-color .ace_indent-guide-active": {
	// background: "url(data:image/png",base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC) right repeat-y;
},
});
