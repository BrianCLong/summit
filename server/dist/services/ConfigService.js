export const ConfigService = {
    ombudsUrl() {
        const u = process.env.OMBUDS_APPEAL_URL?.trim();
        return u && u.length > 0 ? u : null;
    },
};
//# sourceMappingURL=ConfigService.js.map