// const FREE_GIFT = {
//     variantId: 42942812815431,      //---- free gift product ----
//     threshold: 5000      //---- value for getting gift ----
// };

/*---------- Get Details Into Obj ----------*/ 
const FREE_GIFT = {
    enabled: window.freeGiftConfig?.enabled,
    variantId: Number(window.freeGiftConfig?.variantId),
    threshold: Number(window.freeGiftConfig?.threshold)
};  //----- use optional chaining for checking property is exist or not -----


console.log("Free_Gift JS Code Loaded.........");


/*---------- Get Card Details ----------*/
async function getCart() {
    try {
        const response = await fetch("/cart.js");
        console.log("Print response : ", response.json());
        

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


/*---------- Test Function ----------*/
async function handleFreeGift() {
    if (!FREE_GIFT.enabled || !FREE_GIFT.variantId || !FREE_GIFT.threshold) {
        return false;
    }
    const cart = await getCart();

    if (!cart) return false;

    // const getItem = getGiftItem(cart);

    // let subtotal = cart.original_total_price / 100;
    let giftExists = hasGift(cart);
    let cartChanged = false;


    subtotal = cart.items.reduce((total, item) => {
        if (item.variant_id === FREE_GIFT.variantId) return total;
        return total + item.final_line_price;
    }, 0);


    //---- free product condition ----
    if (subtotal >= FREE_GIFT.threshold) {
        if (!giftExists) {
            console.log("ADD FREE GIFT");
            await addGift();
            cartChanged = true;
        }
    } else {
        if (giftExists) {
            await removeGift(cart);
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


    // if (cartChanged) {
    //     return true;
    // }

    // return cartChanged;
}

// handleFreeGift();


/*---------- Checking Gift Existence ----------*/
function hasGift(cart) {
    return cart.items.some((item) => {
        // console.log("Print Items : ", item);

        return item.variant_id === FREE_GIFT.variantId;
    });
}



/*---------- Add Free Gift ----------*/
async function addGift() {
    try {
        const response = await fetch('/cart/add.js', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: FREE_GIFT.variantId,
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
async function removeGift(cart) {
    try {
        const giftItemData = getGiftItem(cart);

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
            console.log(data);

            return data;
            // console.log("print from removeGift() line num",data);
        }

    } catch (error) {
        console.log("Gift Product Removing Error : ", error);

    }
}


/*---------- Get Gift Product Item From Card ----------*/
function getGiftItem(cart) {
    return cart.items.find(item => item.variant_id === FREE_GIFT.variantId)
}


window.handleFreeGift = handleFreeGift;
