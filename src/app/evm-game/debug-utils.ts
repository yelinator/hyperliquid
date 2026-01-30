// Debug utilities for EVM game

export const debugContractCall = async (contract: any, methodName: string, args: any[]) => {
  try {
    console.log(`Calling contract method: ${methodName}`);
    console.log(`Arguments:`, args);
    
    const result = await contract[methodName](...args);
    console.log(`Result:`, result);
    return result;
  } catch (error: any) {
    console.error(`Error calling ${methodName}:`, error);
    console.error(`Error code:`, error.code);
    console.error(`Error message:`, error.message);
    console.error(`Error data:`, error.data);
    throw error;
  }
};

export const debugTransaction = async (tx: any) => {
  try {
    console.log(`Transaction sent:`, tx.hash);
    console.log(`Transaction details:`, tx);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed:`, receipt);
    return receipt;
  } catch (error: any) {
    console.error(`Error waiting for transaction:`, error);
    console.error(`Error code:`, error.code);
    console.error(`Error message:`, error.message);
    console.error(`Error data:`, error.data);
    throw error;
  }
};