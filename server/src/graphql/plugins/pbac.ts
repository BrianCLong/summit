const pbacPlugin = () => ({
    async requestDidStart() {
        return {
            async willSendResponse() { }
        };
    }
});

export default pbacPlugin;
