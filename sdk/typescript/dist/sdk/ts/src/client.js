import { getMaestroOrchestrationAPI } from "../sdk/ts/src/generated";
import axios from 'axios';
export const createClient = (baseURL, token) => {
    // Configure the default axios instance
    axios.defaults.baseURL = baseURL;
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    else {
        delete axios.defaults.headers.common['Authorization'];
    }
    // Return the generated API functions
    return getMaestroOrchestrationAPI();
};
