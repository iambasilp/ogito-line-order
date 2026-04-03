import { Request, Response } from 'express';
import Receipt from '../models/Receipt';

export const getReceipts = async (req: Request, res: Response) => {
  try {
    // Basic implementation: fetch all receipts, sorted by date
    // We can add filtering by route/date later if needed via query params
    const receipts = await Receipt.find().sort({ collectedAt: -1 });
    res.json(receipts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { 
      orderId, 
      orderCustomer, 
      orderRoute, 
      orderTotal, 
      amount, 
      paymentType, 
      transactionRef, 
      collectedBy, 
      collectedAt 
    } = req.body;

    const newReceipt = new Receipt({
      orderId,
      orderCustomer,
      orderRoute,
      orderTotal,
      amount,
      paymentType,
      transactionRef,
      collectedBy,
      collectedAt: collectedAt || new Date()
    });

    const savedReceipt = await newReceipt.save();
    res.status(201).json(savedReceipt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReceipt = await Receipt.findByIdAndDelete(id);
    
    if (!deletedReceipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    res.json({ message: 'Receipt deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
