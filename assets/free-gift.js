/*---------- Get Details Into Obj ----------*/
const FREE_GIFT = {
    enabled: window.freeGiftConfig?.enabled,
    variantId: Number(window.freeGiftConfig?.variantId),
    threshold: Number(window.freeGiftConfig?.threshold)
};  //----- use optional chaining for checking property is exist or not -----


/*---------- Get Card Details ----------*/
async function getCart() {
    try {
        const response = await fetch("/cart.js");

        if (!response.ok) {
            throw new Error("Failed to fetch cart");
        }
        return await response.json();
    }
    catch (error) {
        console.error("Cart fetch error:", error);
        return null;
    }
}


/*---------- HandleFreeGift Based On Product Function ----------*/
async function handleFreeGift() {
    //---- check properties ----
    if (!FREE_GIFT.enabled || !FREE_GIFT.variantId || !FREE_GIFT.threshold) {
        return false;
    }
    const cart = await getCart();

    //---- check cart is not empty ----
    if (!cart) return false;

    //---- get data ---- 
    const variantId = FREE_GIFT.variantId;
    let giftExists = isVariantInCart(cart, variantId);
    let cartChanged = false;

    //---- get subtotal ----
    const subtotal = cart.items.reduce((total, item) => {
        if (item.variant_id === FREE_GIFT.variantId) return total;
        return total + item.final_line_price;
    }, 0);

    //---- free product condition ----
    if (subtotal >= FREE_GIFT.threshold) {
        if (!giftExists) {
            await addGift(variantId);
            cartChanged = true;
        }
    } else {
        if (giftExists) {
            await removeGift(cart, variantId);
            console.log("REMOVE FREE GIFT");
            cartChanged = true;
        }
    }


    if (cartChanged) {
        await publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'free-gift',
            cartData: await getCart()
        });

        return true;
    }
}



/*---------- Free Gift To Products ----------*/
async function handleProductBasedFreeGift(triggerVariantId, freeGiftVariantId) {
    const cart = await getCart();

    if (!cart) return;

    let cartChanged = false;

    //---- check variant ids ----
    if (!triggerVariantId || !freeGiftVariantId) {
        console.log("Variant ID is Empty");
        return;
    }

    //-- Convert to Number (FormData returns string) --
    triggerVariantId = Number(triggerVariantId);
    freeGiftVariantId = Number(freeGiftVariantId);

    //---- check trigger & gift product existence ----
    const giftProductExists = isVariantInCart(cart, freeGiftVariantId);
    const triggerProductExist = isVariantInCart(cart, triggerVariantId)

    //---- check triggerproduct ----
    if (triggerProductExist) {
        //--- Gift Not Present ---
        if (!giftProductExists) {
            await addGift(freeGiftVariantId);
            console.log("Gift Product Added Successfully");
            cartChanged = true;
        }
    }
    else {
        //--- gift is present ----
        if (giftProductExists) {
            await removeGift(cart, freeGiftVariantId)
            console.log("Gift Deleted Successfully");
            cartChanged = true;
        }
    }

    
    //----- Send Updated Cart and Refresh It ----- 
    if (cartChanged) {
        await publish(PUB_SUB_EVENTS.cartUpdate, {
            source: "free-product-gift",
            cartData: await getCart()
        });

        return true;
    }
}


/*---------- Checking Gift Existence ----------*/
function isVariantInCart(cart, variantId) {
    return cart.items.some(
        item => item.variant_id === variantId
    );
}


/*---------- Add Free Gift ----------*/
async function addGift(variantId) {
    try {
        const response = await fetch('/cart/add.js', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: variantId,
                quantity: 1
            })
        });

        if (!response.ok) {
            throw new Error("Unable to add free gift");
        }

        const data = await response.json();
        console.log("Gift Added Successfully", data);

    }
    catch (e) {
        console.log("Error : ", e);

    }
}


/*---------- Remove Free Gift Product ----------*/
async function removeGift(cart, variantId) {
    try {
        const giftItemData = getGiftItem(cart, variantId);

        //---- check gift-item-data != blank ----
        if (giftItemData) {
            const response = await fetch("/cart/change.js", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: giftItemData.key,
                    quantity: 0
                })
            })

            if (!response.ok) {
                throw new Error("Gift Product Remove Failed");
            }

            const data = await response.json();
        }

    } catch (error) {
        console.log("Gift Product Removing Error : ", error);
    }
}


/*---------- Get Gift Product Item From Card ----------*/
function getGiftItem(cart, variantId) {
    return cart.items.find(item => item.variant_id === variantId)
}




/*---------- Makes Funciton Uses For Globale Level ----------*/
window.handleFreeGift = handleFreeGift;
window.handleProductBasedFreeGift = handleProductBasedFreeGift;