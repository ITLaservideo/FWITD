using DotNet.Utility;
using FWITD;
using System;
using System.Collections.Generic;
using System.Data;
using System.Text;

namespace FWITD.Controllers.AnaliziDiDati {
    internal class DataAnalizis1Controller {
        public object GetVendite() {
            DataTable dt = SQL.ExecuteQuery(@"SELECT  
                                                iwmiMovDate + iwmiMovTime AS TheTime,
                                                iwmiMovCause AS Category,
                                                iwmiAmount AS Price,
                                                SUM(iwmiAmount) OVER (
                                                    ORDER BY iwmiMovDate + iwmiMovTime
                                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                                ) AS CumulativePrice
                                            FROM IW_MovItems
                                            order by TheTime;");
            return Utils.DataTransfer.ToSimpleTable(dt);
        }
        public object GetChange() {
            DataTable dt = SQL.ExecuteQuery(@"SELECT  
                                                iwmiMovDate + iwmiMovTime AS TheTime,
                                                iwmiMovCause AS Category,
                                                iwmiAmount AS Change,
                                                SUM(iwmiAmount) OVER (
                                                    ORDER BY iwmiMovDate + iwmiMovTime
                                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                                ) AS CumulativeChange
                                            FROM IW_MovItems
                                            order by TheTime;");
            return Utils.DataTransfer.ToSimpleTable(dt);
        }
    }
}
