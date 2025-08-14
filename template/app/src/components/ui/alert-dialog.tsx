import React from 'react';
import { Button } from './button';

interface AlertDialogProps {
  children: React.ReactNode;
}

interface AlertDialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
}

interface AlertDialogActionProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

interface AlertDialogCancelProps {
  children: React.ReactNode;
}

// Simple dialog context
const AlertDialogContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function AlertDialog({ children }: AlertDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child) && child.type === AlertDialogContent) {
                return child;
              }
              return null;
            })}
          </div>
        </div>
      )}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ asChild, children }: AlertDialogTriggerProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        setIsOpen(true);
      },
    });
  }
  
  return (
    <button onClick={() => setIsOpen(true)}>
      {children}
    </button>
  );
}

export function AlertDialogContent({ children }: AlertDialogContentProps) {
  return (
    <>
      {children}
    </>
  );
}

export function AlertDialogHeader({ children }: AlertDialogHeaderProps) {
  return (
    <div className="mb-4">
      {children}
    </div>
  );
}

export function AlertDialogTitle({ children }: AlertDialogTitleProps) {
  return (
    <h2 className="text-lg font-semibold text-gray-900 mb-2">
      {children}
    </h2>
  );
}

export function AlertDialogDescription({ children }: AlertDialogDescriptionProps) {
  return (
    <p className="text-sm text-gray-600">
      {children}
    </p>
  );
}

export function AlertDialogFooter({ children }: AlertDialogFooterProps) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      {children}
    </div>
  );
}

export function AlertDialogAction({ 
  onClick, 
  className, 
  disabled, 
  children 
}: AlertDialogActionProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext);
  
  return (
    <Button
      onClick={() => {
        onClick?.();
        setIsOpen(false);
      }}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function AlertDialogCancel({ children }: AlertDialogCancelProps) {
  const { setIsOpen } = React.useContext(AlertDialogContext);
  
  return (
    <Button
      variant="outline"
      onClick={() => setIsOpen(false)}
    >
      {children}
    </Button>
  );
}
