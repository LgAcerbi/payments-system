class Utils {
    public static toKebabCase(str: string): string {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    public static toCamelCase(str: string): string {
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }
}

export default Utils;
export { Utils };
