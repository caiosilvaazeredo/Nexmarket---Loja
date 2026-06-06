import * as React from "react"
import { cn } from "@/src/lib/utils"
import { motion, MotionProps } from "motion/react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "ghost" | "supermarket";
  size?: "default" | "sm" | "lg" | "icon";
  themeColor?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps & MotionProps>(
  ({ className, variant = "default", size = "default", themeColor, ...props }, ref) => {
    
    const baseClass = "inline-flex items-center justify-center rounded-2xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-1 active:border-b-0";
    
    // Duolingo style variants
    const variants = {
      default: "bg-[#58CC02] text-white border-b-4 border-[#58A700] hover:bg-[#46A302]",
      secondary: "bg-white text-slate-500 border-2 border-b-4 border-slate-200 hover:bg-slate-50 hover:text-slate-600",
      danger: "bg-[#FF4B4B] text-white border-b-4 border-[#EA2B2B] hover:bg-[#E53D3D]",
      ghost: "hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:translate-y-0 active:border-b-0 border-b-0",
      supermarket: "text-white border-b-4", // dynamic based on themeColor
    };
    
    const sizes = {
      default: "h-12 px-4 py-2",
      sm: "h-9 px-3 text-xs",
      lg: "h-14 px-8 text-lg rounded-2xl",
      icon: "h-12 w-12",
    };

    const style = themeColor && variant === "supermarket" 
      ? { backgroundColor: themeColor, borderColor: "rgba(0,0,0,0.2)" } 
      : {};

    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        className={cn(baseClass, variants[variant], sizes[size], className)}
        ref={ref}
        style={style}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
