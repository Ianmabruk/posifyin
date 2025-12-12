# TODO: Enhance Product Cards and Cashier POS with Discounts and Admin Access

## Step 1: Enlarge Product Cards for Full Image Display ✅
- Modify ProductCard.jsx to increase image height and adjust card layout
- Ensure images fit properly without cropping

## Step 2: Add Active Discounts Feature to Product Cards ✅
- Integrate DiscountSelector component into ProductCard.jsx
- Display active discounts on product cards
- Show discounted prices when applicable

## Step 3: Add Active Discounts Section to Cashier POS ✅
- Modify CashierPOS.jsx to include a discounts sidebar or section
- Fetch and display active discounts
- Allow cashiers to apply discounts during checkout

## Step 4: Enable Admin to Change Discounts
- Ensure admin can manage discounts via existing Discounts.jsx
- Add discount management controls to product cards if needed

## Step 5: Allow Admin to Access Cashier POS by Choosing User ✅
- Modify UserManagement.jsx to add "Access POS" button for cashiers
- Create functionality to switch to live cashier POS session
- Implement session management for admin access

## Step 6: Testing and Integration ✅
- Test all features work together
- Ensure proper permissions and access controls
- Verify UI responsiveness and user experience
