declare module "*.png";
declare module "*.svg";
declare module "*.jpeg";
declare module "*.jpg";
declare module "*.webp";
declare module "*.mov";


interface IPropsOfComponent {
    className?: string;
    children?: ReactNode | string;
    [key: string]: any;
}

interface Window {
    init: () => void;
    inited:boolean;
}

declare module 'react-notifications';