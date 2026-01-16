
import dom = require("../../lib/dom");

dom.importCss({
'.ace_settingsmenu, .kbshortcutmenu': {
	backgroundColor: '#F7F7F7',
	textColor: '#000',
	boxShadow: '-5 4 5 rgba(126, 126, 126, 0.55)',
	// padding: '1em 0.5em 2em 1em',
	padding: [16, 8, 32, 16], // text size: 16
	// overflow: 'auto',
	// position: 'absolute',
	// margin: 0,
	marginBottom: 0,
	marginTop: 0,
	marginRight: 0,
	height: 'match',
	align: 'end',
	zIndex: 9991,
	cursor: 'default',
},

'.ace_dark .ace_settingsmenu, .ace_dark .kbshortcutmenu': {
	boxShadow: '-20 10 25 rgba(126, 126, 126, 0.25)',
	// backgroundColor: 'rgba(255, 255, 255, 0.6)',
	textColor: '#000',
},

'.ace_optionsMenuEntry:normal': {
	backgroundColor: 'rgba(255, 255, 255, 0.6)',
	time: 300, // 300ms
},

'.ace_optionsMenuEntry:hover': {
	backgroundColor: 'rgba(100, 100, 100, 0.1)',
	// transition: 'all 0.3s'
	time: 300, // 300ms
},

'.ace_closeButton': {
	// backgroundColor: 'rgba(245, 146, 146, 0.5)',
	backgroundColor: 'rgba(245, 146, 146, 0.9)',
	border: '1 #F48A8A',
	// borderRadius: '50%',
	borderRadius: 50,
	padding: 7,
	// position: 'absolute',
	marginRight: -8,
	marginTop: -8,
	align: 'end',
	zIndex: 100000,
},
'.ace_optionsMenuKey': {
	textColor: '#483D8B',
	textWeight: 'bold',
},
'.ace_optionsMenuCommand': {
	textColor: '#008B8B',
	textWeight: 'regular',
},
'.ace_optionsMenuEntry .input, .ace_optionsMenuEntry .button': {
	// vertical-align: middle;
	align: 'middle',
},

// .ace_optionsMenuEntry button[ace_selected_button=true] {
'.ace_optionsMenuEntry .button.ace_selected_button': {
	backgroundColor: '#e7e7e7',
	// boxShadow: 1px 0px 2px 0px #adadad inset;
	boxShadow: '1 0 2 #adadad',
	borderColor: '#adadad',
},
'.ace_optionsMenuEntry .button': {
	backgroundColor: '#fff',
	border: '1 #D3D3D3',
	margin: 0,
},
'.ace_optionsMenuEntry .button:hover': {
	backgroundColor: '#f0f0f0',
}
}, "settings_menu.css", false);
