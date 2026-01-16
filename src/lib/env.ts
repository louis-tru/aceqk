
import * as os from 'quark/os';

export const name = os.name();
export const model = os.model();
export const android = name == 'Android';
export const macOS = name == 'MacOSX';
export const isMac = macOS;
export const iOS = name == 'iOS';
export const mobile = iOS || android;
export const iPod = model == 'iPod touch';
export const iPhone = model == 'iPhone';
export const iPad = model == 'iPad';
export const apple = iOS || macOS;
export const windows = false;//name == 'Windows';

declare global {
	namespace ace {
		const env: {
			readonly name: typeof name;
			readonly model: string;
			readonly android: boolean;
			readonly macOS: boolean;
			readonly isMac: boolean;
			readonly iOS: boolean;
			readonly iPod: boolean;
			readonly iPhone: boolean;
			readonly iPad: boolean;
			readonly mobile: boolean;
			readonly apple: boolean;
			readonly windows: boolean;
		};
	}
}

// Ensure global 'ace' object exists
if (!globalThis.ace)
	Object.defineProperty(globalThis, 'ace', {value:{}});

// Define 'ace.env' property
Object.defineProperty(ace, 'env', {
	value: {
		name,
		model,
		android,
		macOS,
		isMac: macOS,
		iOS,
		iPod,
		iPhone,
		iPad,
		mobile,
		apple,
		windows,
	},
	writable: false,
	enumerable: true,
	configurable: false,
});