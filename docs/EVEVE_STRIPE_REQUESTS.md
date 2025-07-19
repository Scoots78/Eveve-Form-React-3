# Eveve Stripe procedure, calls responses

## Hold Booking
- hold https://nz.eveve.com/web/hold?est=TestNZA&lng=en&covers=10&date=2025-07-25&time=16&area=1000
    - {"ok":true,"uid":42015,"created":1752780515,
"full":"Test System (pl_data)",
"ots":[[0,1023,"Tickbox","Test Booking option 1"],[0,1024,"Yes/No","Test Booking option 1"],[1,1001,"Tickbox","Customer options 1"],[1,1002,"Yes/No","Customer options 2"]]
,
"card":2,"perHead":3000,"until":""}

## Update
- update with booking details - TBC details and sample calls to be added


# Stripe | CC request called after update
- CC request loads eveve stripe form

### 1. Deposit type transaction (Deposit and Payment intent are the same at this stage) SS is this required as you can call the pi-get directly?
Request

    https://app.eveve.com/ccrequest?desc=0&lang=en&est=TestNZA&UID_Booked=42015&created=1752780515
- response is eveve form


### pi-get (Get Client secret) | These details were setup as deposit and no show the same as below
Deposit

    https://uk6.eveve.com/int/pi-get?est=TestNZA&uid=42015&type=0&desc=0&created=1752780515

No-Show

    https://uk6.eveve.com/int/pi-get?est=TestNZA&uid=42023&type=0&desc=0&created=1752798771

Deposit Response
          
    {
        "est": "TestNZA",
        "uid": "42015",
        "type": "0",
        "host": "NZ5.eveve.com",
        "port": 4319,
        "client_secret": "seti_1Rlo2PDXdlJD3I0qyrQ7O0rn_secret_ShCRZ2vMbNRhNvDDkmTIoI0XUV15dWN",
        "public_key": "pk_test_QZqsbhatlQf5Jv0jYkGGjk3Y001i4qFtLZ",
        "account": "",
        "cust": "cus_ShCRjV5cPQDXzb"
    }

No-Show response

    {
        "est":"TestNZA",
        "uid":"42023",
        "type":"0",
        "host":"NZ5.eveve.com",
        "port":4319,"client_secret":"seti_1RlqzhDXdlJD3I0qHi8RnKG2_secret_ShFU8Y9u2kYRPmRqHZDtn6BYw83H3qY",
        "public_key":"pk_test_QZqsbhatlQf5Jv0jYkGGjk3Y001i4qFtLZ",
        "account":"",
        "cust":"cus_ShFUXxEJiaC1tM"
    }

### Deposit Get (this is the call if deposit is set, rather than credit cards registration. It is made directy after the pi-get call) 
    https://uk6.eveve.com/int/deposit-get?est=TestNZA&UID=42015&created=1752780515&lang=english&type=0

Call returns 'code:2' this will be a credit charge for a deposit, card charged at this point

    {
        "ok":true,
        "noshow":false,
        "code":2,
        "total":30000,
        "perHead":3000,
        "totalFloat":300.00,
        "amount":"&#36;300.00",
        "currency":"NZD",
        "error":"",
        "message":"We require a c/c deposit to complete your reservation<br/>",
        "onlineLink":"https://nz6.eveve.com/TMS/DateCovers.php?est=TestNZA&covers=10",
        "stripePK":"pk_test_QZqsbhatlQf5Jv0jYkGGjk3Y001i4qFtLZ",
        "success":""
    }

No-Show

https://uk6.eveve.com/int/deposit-get?est=TestNZA&UID=42023&created=1752798771&lang=english&type=0

Call returns 'code:1' for no show meaning card will not be charged at this point

    {
        "ok":true,
        "noshow":true,
        "code":1,
        "total":30000,
        "perHead":3000,
        "totalFloat":300.00,
        "amount":"&#36;300.00",
        "currency":"NZD",
        "error":"",
        "message":"A charge of 30.00 per person will be applied in the event of a no-show<br/>",
        "onlineLink":"https://nz6.eveve.com/TMS/DateCovers.php?est=TestNZA&covers=10",
        "stripePK":"pk_test_QZqsbhatlQf5Jv0jYkGGjk3Y001i4qFtLZ",
        "success":""
    }

### Web Socket (not sure what this does)   
    - wss://us12.eveve.com/api/notifications/?EIO=4&transport=websocket    


# Credit card details are submitted

### Restore | Booking UID | type ! i think this is to make sure the booking exists first
Request

    https://uk6.eveve.com/api/restore?est=TestNZA&uid=42015&type=0

Response

    {"ok":true,"table":[1009,1010,1011]}




### pm-id Payment intent only response - No show
Request

    https://uk6.eveve.com/int/pm-id?est=TestNZA&uid=42023&created=1752798771&pm=pm_1RlrCVDXdlJD3I0quz1cIZSn&total=30000&totalFloat=300&type=0

Response

    {
        "ok":true,
        "noshow":true,
        "code":1,
        "total":30000,
        "perHead":3000,
        "totalFloat":300.00,
        "amount":"&#36;300.00",
        "currency":"NZD",
        "error":"",
        "message":"A charge of 30.00 per person will be applied in the event of a no-show<br/>",
        "onlineLink":"https://nz6.eveve.com/TMS/DateCovers.php?est=TestNZA&covers=10",
        "stripePK":"pk_test_QZqsbhatlQf5Jv0jYkGGjk3Y001i4qFtLZ",
        "success":""
    }



## Call to stripe - confirm - probably to check if payment was ok or not
Request

    https://api.stripe.com/v1/setup_intents/seti_1RlpIaDXdlJD3I0qaPImOJxG/confirm  

Response

    {
        "id": "seti_1RlpIaDXdlJD3I0qaPImOJxG",
        "object": "setup_intent",
        "automatic_payment_methods": null,
        "cancellation_reason": null,
        "client_secret": "seti_1RlpIaDXdlJD3I0qaPImOJxG_secret_ShDk3o20KKhRvQ4udzdNWkQyYdOhzJk",
        "created": 1752749064,
        "description": null,
        "last_setup_error": null,
        "livemode": false,
        "next_action": null,
        "payment_method": "pm_1RlpMhDXdlJD3I0qL7Q0Jzog",
        "payment_method_configuration_details": null,
        "payment_method_types": [
            "card"
        ],
        "status": "succeeded",
        "usage": "off_session"
    }      



# Done    

