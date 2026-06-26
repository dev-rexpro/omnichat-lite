"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface User {
    id: string;
    username: string;
    email?: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Init auth from local storage
        const savedUser = localStorage.getItem("omnichat_user");
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (e) {
                console.error("Failed to parse user", e);
                localStorage.removeItem("omnichat_user");
            }
        }
        setIsLoading(false);
    }, []);

    const login = (username: string) => {
        // Simple mock login
        const newUser: User = {
            id: `user-${crypto.randomUUID()}`,
            username: username
        };
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem("omnichat_user", JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("omnichat_user");
        // Optional: clear other buffers
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
