const express = require('express')
const path = require('path')

const app = express()
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

const APP_SECRET = process.env['APP_SECRET']
const CLIENT_ID = process.env['CLIENT_ID']

const baseURL = {
  sandbox: "https://api-m.sandbox.paypal.com",
  production: "https://api-m.paypal.com"
};

app.get('/', (req, res) => {
  res.render("index", {
    paypalClientId:
      CLIENT_ID

  })
})
app.get('/cart', (req, res) => {
  res.render("cart", {
    paypalClientId:
      CLIENT_ID
  }
  )
})

app.get('/thank/:id', (req, res) => {
  var info = req.params.id;
  info = info.split("=")[1]
  res.render('thank', {
    id: info
  })
})

app.listen(3000)

var qty = 0
var price = 1000.00
var total = 0
var userInfo
app.post('/my-server/create-paypal-order', async (req, res) => {
  var data = req.body
  qty = data.items[0].qty
  userInfo = data.user[0]
  total = parseFloat(qty * price).toFixed(2)
  console.log(userInfo)
  const order = await createOrder();
  res.json(order);
})


app.post("/my-server/capture-paypal-order", async (req, res) => {
  console.log('here')
  const { orderID } = req.body;
  const captureData = await capturePayment(orderID);
  res.json(captureData);
});


async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${baseURL.sandbox}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
}

async function createOrder() {
  const accessToken = await generateAccessToken();
  const url = `${baseURL.sandbox}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      application_context: {
        brand_name: 'myBrand',
        locale: 'us-US',
        shipping_preference: 'SET_PROVIDED_ADDRESS',
      },
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: total,
          },
          shipping: {
            name: {
              full_name: userInfo.firstName + "  " + userInfo.lastName
            },
            address: {
              address_line_1: userInfo.address,
              admin_area_2: userInfo.state,
              postal_code: userInfo.zip,
              country_code: 'US',
            }
          }

        },
      ],
    }),
  });
  const data = await response.json();
  return data;
}

async function generateAccessToken() {
  const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64")
  const response = await fetch(`${baseURL.sandbox}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
}

