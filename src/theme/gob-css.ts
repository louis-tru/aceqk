import * as dom from "../lib/dom";
dom.importCss({
".ace-gob .ace_gutter": {
	backgroundColor: "#0B1818",
	textColor:"#03EE03",
},

".ace-gob .ace_print-margin": {
	width: 1,
	backgroundColor: "#131313",
},

".ace-gob": {
	backgroundColor: "#0B0B0B",
	textColor:"#00FF00",
},

".ace-gob .ace_cursor": {
	borderColor: "rgba(16, 248, 255, 0.90)",
	backgroundColor: "rgba(16, 240, 248, 0.70)",
	opacity: 0.4,
},

".ace-gob .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(221, 240, 255, 0.20)",
},

".ace-gob.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #141414",
},

".ace-gob .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(16, 128, 0)",
},

".ace-gob .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 rgba(64, 255, 255, 0.25)",
},

".ace-gob .ace_marker-layer .ace_active-line": {
	backgroundColor: "rgba(255, 255, 255, 0.04)",
},

".ace-gob .ace_gutter-active-line": {
	backgroundColor: "rgba(255, 255, 255, 0.04)",
},

".ace-gob .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(192, 240, 255, 0.20)",
},

".ace-gob .ace_invisible": {
	textColor:"rgba(255, 255, 255, 0.25)",
},

".ace-gob .ace_keyword,.ace-gob .ace_meta": {
	textColor:"#10D8E8",
},

".ace-gob .ace_constant,.ace-gob .ace_constant.ace_character,.ace-gob .ace_constant.ace_character.ace_escape,.ace-gob .ace_constant.ace_other,.ace-gob .ace_heading,.ace-gob .ace_markup.ace_heading,.ace-gob .ace_support.ace_constant": {
	textColor:"#10F0A0",
},

".ace-gob .ace_invalid.ace_illegal": {
	textColor: "#F8F8F8",
	backgroundColor: "rgba(86, 45, 86, 0.75)",
},

".ace-gob .ace_invalid.ace_deprecated": {
	// text-decoration: "underline",
	fontSlant: "italic",
	textColor:"#20F8C0",
},

".ace-gob .ace_support": {
	textColor:"#20E8B0",
},

".ace-gob .ace_fold": {
	backgroundColor: "#50B8B8",
	borderColor: "#70F8F8",
},

".ace-gob .ace_support.ace_function": {
	textColor:"#00F800",
},

".ace-gob .ace_list,.ace-gob .ace_markup.ace_list,.ace-gob .ace_storage": {
	textColor:"#10FF98",
},

".ace-gob .ace_entity.ace_name.ace_function,.ace-gob .ace_meta.ace_tag,.ace-gob .ace_variable": {
	textColor:"#00F868",
},

".ace-gob .ace_string": {
	textColor:"#10F060",
},

".ace-gob .ace_string.ace_regexp": {
	textColor: "#20F090",
},

".ace-gob .ace_comment": {
	fontSlant: "italic",
	textColor: "#00E060",
},

".ace-gob .ace_variable": {
	textColor: "#00F888",
},

".ace-gob .ace_xml-pe": {
	textColor: "#488858",
},

".ace-gob .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWMQERFpYLC1tf0PAAgOAnPnhxyiAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-gob .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
