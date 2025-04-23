import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { Portfolio, SharePosition, OptionPosition } from '../types/portfolio';

// Define the shape of the context value
interface PortfolioContextType {
  portfolio: Portfolio;
  addShare: (share: Omit<SharePosition, 'id'>) => void;
  addOption: (option: Omit<OptionPosition, 'id'>) => void;
  removeShare: (id: string) => void;
  removeOption: (id: string) => void;
  loadPortfolio: (loadedPortfolio: Portfolio) => void;
  // --- START: Add Editing State and Functions ---
  editingPositionId: string | null; // ID of the item being edited
  editingPositionType: 'share' | 'option' | null; // Type of item being edited
  startEditing: (id: string, type: 'share' | 'option') => void; // Function to begin editing
  cancelEditing: () => void; // Function to stop editing
  updateShare: (id: string, updatedShareData: Omit<SharePosition, 'id'>) => void;
  updateOption: (id: string, updatedOptionData: Omit<OptionPosition, 'id'>) => void;
  // --- END: Add Editing State and Functions ---
}

// Create the context with an undefined initial value
const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined
);

// Define the props for the provider component
interface PortfolioProviderProps {
  children: ReactNode;
}

// Initial empty state for the portfolio
const initialPortfolio: Portfolio = {
  shares: [],
  options: [],
};

// Key for local storage
const LOCAL_STORAGE_KEY = 'optionsPortfolio';

// Create the provider component
export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({
  children,
}) => {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    // Load initial state from local storage if available
    try {
      const savedPortfolio = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedPortfolio ? JSON.parse(savedPortfolio) : initialPortfolio;
    } catch (error) {
      console.error('Error loading portfolio from local storage:', error);
      return initialPortfolio;
    }
  });

  // --- START: Add Editing State Variables ---
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionType, setEditingPositionType] = useState<'share' | 'option' | null>(null);
  // --- END: Add Editing State Variables ---

  // Save portfolio to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(portfolio));
    } catch (error) {
      console.error('Error saving portfolio to local storage:', error);
    }
  }, [portfolio]);

  // Function to add a share position (generates a unique ID)
  const addShare = useCallback((shareData: Omit<SharePosition, 'id'>) => {
    const newShare: SharePosition = {
      ...shareData,
      id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    setPortfolio((prev) => ({
      ...prev,
      shares: [...prev.shares, newShare],
    }));
  }, []);

  // Function to add an option position (generates a unique ID)
  const addOption = useCallback((optionData: Omit<OptionPosition, 'id'>) => {
    const newOption: OptionPosition = {
      ...optionData,
      id: `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    setPortfolio((prev) => ({
      ...prev,
      options: [...prev.options, newOption],
    }));
  }, []);

   // Function to remove a share position by ID
   const removeShare = useCallback((id: string) => {
    setPortfolio((prev) => ({
      ...prev,
      shares: prev.shares.filter((share) => share.id !== id),
    }));
  }, []);

  // Function to remove an option position by ID
  const removeOption = useCallback((id: string) => {
    setPortfolio((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== id),
    }));
  }, []);


  // Function to load a complete portfolio (e.g., from an imported file)
  const loadPortfolio = useCallback((loadedPortfolio: Portfolio) => {
    // Basic validation could be added here
    setPortfolio(loadedPortfolio);
  }, []);

  // --- START: Add Update Functions ---
  const updateShare = useCallback((id: string, updatedShareData: Omit<SharePosition, 'id'>) => {
    setPortfolio((prev) => ({
      ...prev,
      shares: prev.shares.map((share) =>
        share.id === id ? { ...updatedShareData, id } : share
      ),
    }));
    setEditingPositionId(null); // Stop editing after update
    setEditingPositionType(null);
  }, []);

  const updateOption = useCallback((id: string, updatedOptionData: Omit<OptionPosition, 'id'>) => {
    setPortfolio((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === id ? { ...updatedOptionData, id } : option
      ),
    }));
    setEditingPositionId(null); // Stop editing after update
    setEditingPositionType(null);
  }, []);
  // --- END: Add Update Functions ---

  // --- START: Add Editing Control Functions ---
  const startEditing = useCallback((id: string, type: 'share' | 'option') => {
    setEditingPositionId(id);
    setEditingPositionType(type);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingPositionId(null);
    setEditingPositionType(null);
  }, []);
  // --- END: Add Editing Control Functions ---

  // Value provided by the context
  const contextValue: PortfolioContextType = {
    portfolio,
    addShare,
    addOption,
    removeShare,
    removeOption,
    loadPortfolio,
    // --- START: Provide editing state and functions ---
    editingPositionId,
    editingPositionType,
    startEditing,
    cancelEditing,
    updateShare,
    updateOption,
    // --- END: Provide editing state and functions ---
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

// Custom hook to use the Portfolio context
export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}; 