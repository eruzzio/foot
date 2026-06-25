import { createContext, useContext, ReactNode } from 'react';
import { ToastType } from '../components/Toast';

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType>({ addToast: () => {} });
export const useToastContext = () => useContext(ToastContext);

export function ToastProvider({ children, addToast }: { children: ReactNode; addToast: (message: string, type?: ToastType, duration?: number) => void }) {
  return <ToastContext.Provider value={{ addToast }}>{children}</ToastContext.Provider>;
}
