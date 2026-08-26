from app.config import settings
from urllib.parse import urlencode
import httpx

from app.db.models import ConnectedAccount, Plan, Provider, User
from datetime import datetime, timedelta, timezone

from app.core.exceptions import ConflictError


# this has 4 jobs
# job 1:  build the google consent url

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email", 
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
] # a list of all the permissions we are asking for

def build_auth_url(state: str) -> str:
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": settings.oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent select_account",
        "include_granted_scopes": "true",
        "state": state, # preventing csrf
    })

# exchange the code for tokens
# here google sends us the code and we send it back as well as the client_secret so that we get the tokens
def exchange_code(code: str) -> dict:
    resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.oauth_redirect_uri,
        "grant_type": "authorization_code",
    })
    resp.raise_for_status()
    return resp.json()

# fetch who logged in
# the previous gives us an access token so here we use it to get the user info
def fetch_userinfo(access_token: str) -> dict:
    resp = httpx.get("https://www.googleapis.com/oauth2/v3/userinfo",
                     headers={"Authorization": f"Bearer {access_token}"})

    resp.raise_for_status()
    return resp.json()

# now based on our login credentials what do we do?
def resolve_login(db, tokens: dict, info: dict, current_user: User | None) -> tuple[User, bool]:
    provider = db.query(Provider).filter_by(key="gmail").one()
    created_new_user = False

    # user doesnot exist
    if current_user is None:
        user = db.query(User).filter_by(primary_email=info["email"]).first()
        if user is None:
            # create a new user
            # no user with that email as primary email
            clash = db.query(ConnectedAccount).filter_by(
                provider_id=provider.id,
                account_identifier=info["email"],
            ).first() # check if that email belongs to another user
            if clash:
                #sign in to that account
                user = db.get(User, clash.user_id)
            else:
                free_plan = db.query(Plan).filter_by(name="free").one()
                user = User(
                    name=info.get("name"),
                    primary_email=info["email"],
                    profile_picture_url=info.get("picture"),
                    plan_id=free_plan.id,
                )
                db.add(user)
                db.flush()  # flush to get the user.id
                created_new_user = True
    else:
        user = current_user


    # user exists
    # first check if there is no user linked to this primary account
    clash = db.query(ConnectedAccount).filter_by(provider_id=provider.id, account_identifier=info["email"]).first()
    if clash and clash.id != user.id:
        raise ConflictError(f"{info['email']} is already linked to another Recall account")

    # now we update the user/account information
    account = db.query(ConnectedAccount).filter_by(user_id=user.id, provider_id=provider.id, account_identifier=info["email"]).first()
    creds = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])).isoformat(),
    }
    # if there is no such account we create the account
    if not account:
        account = ConnectedAccount(
            user_id=user.id,
            display_label=info.get("email"),
            provider_id=provider.id,
            account_identifier=info["email"],
            credentials=creds,
            is_active=True

        )
        db.add(account)
    else:
        # else we set the credentials
        account.credentials = creds

    db.commit()
    return user, created_new_user