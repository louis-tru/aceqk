import * as dom from "../lib/dom";
dom.importCss({

".ace-cloud_editor_dark .ace_gutter": {
	backgroundColor: "#282c34",
	textColor: "#8e96a9",
},

".ace-cloud_editor_dark.ace_dark .ace_tooltip-marker-error.ace_tooltip-marker": {
	backgroundColor: "#ff5d64",
},
".ace-cloud_editor_dark.ace_dark .ace_tooltip-marker-security.ace_tooltip-marker": {
	backgroundColor: "#ff5d64",
},
".ace-cloud_editor_dark.ace_dark .ace_tooltip-marker-warning.ace_tooltip-marker": {
	backgroundColor: "#e0ca57",
},

".ace-cloud_editor_dark .ace_print-margin": {
	width: 1,
	backgroundColor: "#e8e8e8",
},

".ace-cloud_editor_dark": {
	backgroundColor: "#282c34",
	textColor: "#dcdfe4",
},

".ace-cloud_editor_dark .ace_cursor": {
	textColor: "#66b2f0",
},

".ace-cloud_editor_dark .ace_marker-layer .ace_selection": {
	backgroundColor: "#4376bd",
},

".ace-cloud_editor_dark.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #8e96a9",
	borderRadius: 2,
},

".ace-cloud_editor_dark .ace_marker-layer .ace_step": {
	backgroundColor: "#6fb342",
},

".ace-cloud_editor_dark .ace_marker-layer .ace_bracket": {
	margin: [0,0,0,-1],
	border: "1 #e8e8e8",
},

".ace-cloud_editor_dark .ace_gutter-cursor,.ace-cloud_editor_dark .ace_marker-layer .ace_active-line": {
	// box-sizing: "border-box",
	borderTop: "1 #75777a",
	borderBottom: "1 #75777a",
},

".ace-cloud_editor_dark .ace_gutter-cursor": {
	// position: "absolute",
	width: "100%",
},

".ace-cloud_editor_dark .ace_marker-layer .ace_selected-word": {
	border: "1 #9bd0f7",
},

".ace-cloud_editor_dark .ace_fold": {
	backgroundColor: "#66b2f0",
	borderColor: "#dcdfe4",
},

".ace-cloud_editor_dark .ace_keyword": {
	textColor: "#c674dc",
},

".ace-cloud_editor_dark .ace_constant": {
	textColor: "#e5c383",
},

".ace-cloud_editor_dark .ace_constant.ace_numeric": {
	textColor: "#e5c383",
},

".ace-cloud_editor_dark .ace_constant.ace_character.ace_escape": {
	textColor: "#71ccc7",
},

".ace-cloud_editor_dark .ace_support.ace_function": {
	textColor: "#e96a71",
},

".ace-cloud_editor_dark .ace_support.ace_class": {
	textColor: "#e5c383",
},

".ace-cloud_editor_dark .ace_storage": {
	textColor: "#c674dc",
},

".ace-cloud_editor_dark .ace_invalid.ace_illegal": {
	textColor: "#dcdfe4",
	backgroundColor: "#66b2f0",
},

".ace-cloud_editor_dark .ace_invalid.ace_deprecated": {
	textColor: "#dcdfe4",
	backgroundColor: "#e5c383",
},

".ace-cloud_editor_dark .ace_string": {
	textColor: "#6fb342",
},

".ace-cloud_editor_dark .ace_string.ace_regexp": {
	textColor: "#6fb342",
},

".ace-cloud_editor_dark .ace_comment,.ace-cloud_editor_dark .ace_ghost_text": {
	textColor: "#b5bac0",
	opacity: 1,
},

".ace-cloud_editor_dark .ace_variable": {
	textColor: "#66b2f0",
},

".ace-cloud_editor_dark .ace_meta.ace_selector": {
	textColor: "#c674dc",
},

".ace-cloud_editor_dark .ace_entity.ace_other.ace_attribute-name": {
	textColor: "#e5c383",
},

".ace-cloud_editor_dark .ace_entity.ace_name.ace_function": {
	textColor: "#e96a71",
},

".ace-cloud_editor_dark .ace_entity.ace_name.ace_tag": {
	textColor: "#66b2f0",
},
".ace-cloud_editor_dark .ace_heading": {
	textColor: "#e96a71",
},

".ace-cloud_editor_dark .ace_xml-pe": {
	textColor: "#e5c383",
},
".ace-cloud_editor_dark .ace_doctype": {
	textColor: "#66b2f0",
},

".ace-cloud_editor_dark .ace_entity.ace_name.ace_tag,\
.ace-cloud_editor_dark .ace_entity.ace_other.ace_attribute-name,\
.ace-cloud_editor_dark .ace_meta.ace_tag,\
.ace-cloud_editor_dark .ace_string.ace_regexp,\
.ace-cloud_editor_dark .ace_variable": {
	textColor: "#66b2f0",
},

".ace-cloud_editor_dark .ace_tooltip": {
	backgroundColor: "#282c34",
	textColor: "#dcdfe4",
},

".ace-cloud_editor_dark .ace_icon_svg.ace_error,.ace-cloud_editor_dark .ace_icon_svg.ace_error_fold": {
	backgroundColor: "#ff5d64",
},
".ace-cloud_editor_dark .ace_icon_svg.ace_security,.ace-cloud_editor_dark .ace_icon_svg.ace_security_fold": {
	backgroundColor: "#ff5d64",
},
".ace-cloud_editor_dark .ace_icon_svg.ace_warning,.ace-cloud_editor_dark .ace_icon_svg.ace_warning_fold": {
	backgroundColor: "#e0ca57",
},
".ace-cloud_editor_dark .ace_icon_svg.ace_info": {
	backgroundColor: "#44b9d6",
},
".ace-cloud_editor_dark .ace_icon_svg.ace_hint": {
	backgroundColor: "#44b9d6",
},
".ace-cloud_editor_dark .ace_highlight-marker": {
	background: null, // "none"
	border: "1 #66b2f0",
},
".ace-cloud_editor_dark .ace_tooltip.ace_hover-tooltip:focus > div": {
	// outline: "1 #44b9d6",
},
".ace-cloud_editor_dark .ace_snippet-marker": {
	backgroundColor: "#434650",
	borderWidth: 0,
},

".ace-cloud_editor_dark.ace_dark.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line": {
	backgroundColor: "#272A30",
	border: "1.5 #299FBC",
},
".ace-cloud_editor_dark.ace_dark.ace_editor.ace_autocomplete .ace_line-hover": {
	border: "1 #d5dbdb",
	backgroundColor: "#272A30",
},
".ace-cloud_editor_dark.ace_dark.ace_editor.ace_autocomplete .ace_completion-meta": {
	textColor: "#95a5a6",
	opacity: 1,
},
".ace-cloud_editor_dark.ace_dark.ace_editor.ace_autocomplete .ace_completion-highlight": {
	textColor: "#2AA0BC",
},
".ace-cloud_editor_dark.ace_dark.ace_editor.ace_autocomplete": {
	boxShadow: ["0 1 1 #001c244d", "1 1 1 #001c2426", "-1 1 1 #001c2426"],
	lineHeight: 1.5,
	border: "1 #2a2e33",
	backgroundColor: "#050506",
	textColor: "#ffffff",
},

});