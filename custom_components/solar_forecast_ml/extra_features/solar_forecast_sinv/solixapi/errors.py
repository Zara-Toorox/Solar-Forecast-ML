# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# * Based on ha-anker-solix by Thomas Luther (@thomluther), MIT License,
#   Copyright (c) 2024 Thomas Luther. MIT notice: LICENSE-ha-anker-solix
# ******************************************************************************

"""Define Anker Solix API errors. @thomas"""


class AnkerSolixError(Exception):
    """Define a base error. @thomas"""


class AuthorizationError(AnkerSolixError):
    """Authorization error. @thomas"""


class ConnectError(AnkerSolixError):
    """Connection error. @thomas"""


class NetworkError(AnkerSolixError):
    """Network error. @thomas"""


class ServerError(AnkerSolixError):
    """Server error. @thomas"""


class RequestError(AnkerSolixError):
    """Request error. @thomas"""


class ItemNotFoundError(RequestError):
    """Requested item not found error. @thomas"""


class ItemExistsError(RequestError):
    """Duplicate item error. @thomas"""


class ItemLimitExceededError(RequestError):
    """Item limit exceeded error. @thomas"""


class BusyError(AnkerSolixError):
    """Busy error. @thomas"""


class RequestLimitError(AnkerSolixError):
    """Request Limit exceeded error. @thomas"""


class VerifyCodeError(AnkerSolixError):
    """Verify code error. @thomas"""


class VerifyCodeExpiredError(AnkerSolixError):
    """Verification code has expired. @thomas"""


class NeedVerifyCodeError(AnkerSolixError):
    """Need verification code error. @thomas"""


class VerifyCodeMaxError(AnkerSolixError):
    """Maximum attempts of verifications error. @thomas"""


class VerifyCodeNoneMatchError(AnkerSolixError):
    """Verify code none match error. @thomas"""


class VerifyCodePasswordError(AnkerSolixError):
    """Verify code password error. @thomas"""


class ClientPublicKeyError(AnkerSolixError):
    """Define an error for client public key error. @thomas"""


class TokenKickedOutError(AnkerSolixError):
    """Define an error for token does not exist because it was kicked out. @thomas"""


class InvalidCredentialsError(AnkerSolixError):
    """Define an error for unauthenticated accounts. @thomas"""


class RetryExceeded(AnkerSolixError):
    """Define an error for exceeded retry attempts. Please try again in 24 hours. @thomas"""


class NoAccessPermission(AnkerSolixError):
    """The device has no access permission. @thomas"""


ERRORS: dict[int, type[AnkerSolixError]] = {
    401: AuthorizationError,
    403: AuthorizationError,
    429: RequestLimitError,
    502: ConnectError,
    504: ConnectError,
    997: ConnectError,
    998: NetworkError,
    999: ServerError,
    10000: RequestError,
    10003: RequestError,
    10004: ItemNotFoundError,
    10007: RequestError,
    21105: BusyError,
    26050: VerifyCodeError,
    26051: VerifyCodeExpiredError,
    26052: NeedVerifyCodeError,
    26053: VerifyCodeMaxError,
    26054: VerifyCodeNoneMatchError,
    26055: VerifyCodePasswordError,
    26070: ClientPublicKeyError,
    26084: TokenKickedOutError,
    26108: InvalidCredentialsError,
    26156: InvalidCredentialsError,
    26161: RequestError,
    31001: ItemExistsError,
    31003: ItemLimitExceededError,
    100053: RetryExceeded,
    160003: NoAccessPermission,
}


def raise_error(data: dict, prefix: str = "Anker Api Error") -> None:
    """Raise the appropriate Api error based upon a response code in json data. @thomas"""
    if isinstance(data, dict) and "code" in data:
        # json dict, get code for server response
        code = int(data.get("code"))
    else:
        return
    if error := ERRORS.get(code) or (AnkerSolixError if code >= 10000 else None):
        raise error(f"({code}) {prefix}: {data.get('msg', 'Error msg not found')}")
